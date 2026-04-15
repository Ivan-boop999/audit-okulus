'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, User, Calendar, Target, TrendingUp, TrendingDown,
  Minus, Printer, Download, CheckCircle2, AlertTriangle, Award, BarChart3,
  Lightbulb, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  answerType: 'YES_NO' | 'SCALE_1_5' | 'SCALE_1_10' | 'SCALE_1_100' | 'MULTIPLE_CHOICE' | 'CHECKLIST' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'DATE';
  weight: number;
  order: number;
}

interface Answer {
  id: string;
  questionId: string;
  answer: string;
  comment: string;
  question: Question;
}

interface Template {
  id: string;
  title: string;
  category: string;
}

interface Auditor {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface Assignment {
  id: string;
  template: Template;
  auditor: Auditor;
  scheduledDate: string;
  dueDate: string;
}

interface AuditResponse {
  id: string;
  assignmentId: string;
  auditorId: string;
  score: number;
  maxScore: number;
  status: string;
  notes: string;
  startedAt: string;
  completedAt: string;
  assignment: Assignment;
  answers: Answer[];
}

interface ScoredAnswer extends Answer {
  scorePercent: number;
}

interface ScoreDistributionBucket {
  label: string;
  range: string;
  min: number;
  max: number;
  count: number;
  color: string;
  bgColor: string;
  textColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANSWER_TYPE_LABELS: Record<string, string> = {
  YES_NO: 'Да / Нет',
  SCALE_1_5: 'Шкала 1–5',
  SCALE_1_10: 'Шкала 1–10',
  SCALE_1_100: 'Шкала 1–100',
  MULTIPLE_CHOICE: 'Множественный выбор',
  CHECKLIST: 'Чек-лист',
  TEXT: 'Текст',
  NUMBER: 'Число',
  PHOTO: 'Фото',
  DATE: 'Дата',
};

function getScoreColor(percent: number): string {
  if (percent >= 80) return '#0d9488'; // teal
  if (percent >= 60) return '#059669'; // emerald
  if (percent >= 40) return '#d97706'; // amber
  if (percent >= 20) return '#ea580c'; // orange
  return '#dc2626'; // red
}

function getScoreColorClass(percent: number): string {
  if (percent >= 80) return 'text-teal-600 dark:text-teal-400';
  if (percent >= 60) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 40) return 'text-amber-600 dark:text-amber-400';
  if (percent >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBadgeStyle(percent: number): { bg: string; text: string; label: string } {
  if (percent >= 80) return { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400', label: 'Отлично' };
  if (percent >= 60) return { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', label: 'Хорошо' };
  if (percent >= 40) return { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', label: 'Удовл.' };
  if (percent >= 20) return { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400', label: 'Слабо' };
  return { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400', label: 'Критично' };
}

function getScoreRowBorder(percent: number): string {
  if (percent < 20) return 'border-l-4 border-l-red-500';
  if (percent < 40) return 'border-l-4 border-l-amber-500';
  return '';
}

function getScoreRowBg(percent: number): string {
  if (percent < 20) return 'bg-red-500/5';
  if (percent < 40) return 'bg-amber-500/5';
  return '';
}

// ─── Scoring Logic ────────────────────────────────────────────────────────────

function calculateQuestionScore(answer: Answer): number {
  const { answerType, answer } = answer.question;
  const val = answer?.toString().trim();

  switch (answerType) {
    case 'YES_NO':
      return val?.toLowerCase() === 'yes' ? 100 : 0;
    case 'SCALE_1_5': {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : (n / 5) * 100;
    }
    case 'SCALE_1_10': {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : (n / 10) * 100;
    }
    case 'SCALE_1_100': {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    }
    case 'MULTIPLE_CHOICE':
    case 'CHECKLIST':
      return val && val.length > 0 ? 50 : 0;
    case 'TEXT':
    case 'NUMBER':
    case 'PHOTO':
    case 'DATE':
      return val && val.length > 0 ? 100 : 0;
    default:
      return 0;
  }
}

// ─── SVG Score Gauge ──────────────────────────────────────────────────────────

function ScoreGauge({ percent, size = 160, strokeWidth = 12 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = getScoreColor(percent);
  const badge = getScoreBadgeStyle(percent);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold tracking-tight"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {percent.toFixed(1)}
        </motion.span>
        <span className="text-xs text-muted-foreground mt-0.5">из 100</span>
        <Badge variant="outline" className={`mt-1.5 text-[10px] px-2 py-0 border-0 ${badge.bg} ${badge.text}`}>
          {badge.label}
        </Badge>
      </div>
    </div>
  );
}

// ─── Score Distribution Chart ─────────────────────────────────────────────────

function ScoreDistributionBar({ distribution }: { distribution: ScoreDistributionBucket[] }) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {distribution.map((bucket) => (
        <div key={bucket.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${bucket.bgColor}`} />
              <span className="text-sm font-medium">{bucket.label}</span>
              <span className="text-xs text-muted-foreground">({bucket.range})</span>
            </div>
            <span className={`text-sm font-bold tabular-nums ${bucket.textColor}`}>
              {bucket.count} {bucket.count === 1 ? 'вопрос' : bucket.count < 5 ? 'вопроса' : 'вопросов'}
            </span>
          </div>
          <div className="relative h-5 w-full rounded-md overflow-hidden bg-muted/40">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(bucket.count / maxCount) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-md ${bucket.bgColor}`}
              style={{ minWidth: bucket.count > 0 ? '8px' : '0' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Recommendations Section ──────────────────────────────────────────────────

function generateRecommendations(lowScored: ScoredAnswer[], totalQuestions: number): string[] {
  const recs: string[] = [];

  const criticalCount = lowScored.filter(a => a.scorePercent < 20).length;
  const poorCount = lowScored.filter(a => a.scorePercent >= 20 && a.scorePercent < 40).length;
  const fairCount = lowScored.filter(a => a.scorePercent >= 40 && a.scorePercent < 60).length;

  if (criticalCount > 0) {
    recs.push(
      `🚨 Критический уровень: ${criticalCount} ${criticalCount === 1 ? 'вопрос' : criticalCount < 5 ? 'вопроса' : 'вопросов'} с оценкой ниже 20%. Необходимо немедленное вмешательство и разработка плана корректирующих действий.`,
    );
  }

  if (poorCount > 0) {
    recs.push(
      `⚠️ Слабые зоны: ${poorCount} ${poorCount === 1 ? 'вопрос' : poorCount < 5 ? 'вопроса' : 'вопросов'} в диапазоне 20–40%. Рекомендуется провести дополнительный анализ и составить график улучшений.`,
    );
  }

  if (fairCount > 0) {
    recs.push(
      `📊 Зоны роста: ${fairCount} ${fairCount === 1 ? 'вопрос' : fairCount < 5 ? 'вопроса' : 'вопросов'} с удовлетворительной оценкой (40–60%). Рекомендуется усилить контроль в этих областях.`,
    );
  }

  if (lowScored.length > 0) {
    const grouped = lowScored.slice(0, 5).map(a => `"${a.question.text}"`).join(', ');
    recs.push(
      `📌 Наиболее проблемные вопросы: ${grouped}${lowScored.length > 5 ? ` и ещё ${lowScored.length - 5}` : ''}.`,
    );
  }

  const lowRatio = lowScored.length / totalQuestions;
  if (lowRatio === 0) {
    recs.push('✅ Отличный результат! Все вопросы набрали высокие баллы. Продолжайте поддерживать текущий уровень.');
  } else if (lowRatio > 0.5) {
    recs.push('🔴 Более половины вопросов получили низкие баллы. Рекомендуется провести повторный аудит после внедрения корректирующих мер.');
  } else if (lowRatio > 0.25) {
    recs.push('🟡 Значительная доля вопросов требует внимания. Запланируйте повторную проверку через 2–4 недели.');
  }

  recs.push(
    '📅 Рекомендуется установить график регулярных проверок для отслеживания динамики улучшений.',
  );

  return recs;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/80 to-muted p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-52" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution + recommendations skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AuditReportDetailProps {
  responseId: string;
  onBack?: () => void;
}

export default function AuditReportDetail({ responseId, onBack }: AuditReportDetailProps) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(`/api/responses?id=${responseId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`);
        return res.json();
      })
      .then((json: AuditResponse) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Не удалось загрузить данные отчёта');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [responseId]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const scoredAnswers = useMemo<ScoredAnswer[]>(() => {
    if (!data?.answers) return [];
    return data.answers.map((a) => ({
      ...a,
      scorePercent: calculateQuestionScore(a),
    }));
  }, [data?.answers]);

  const overallPercent = useMemo(() => {
    if (!data || data.maxScore === 0) return 0;
    return (data.score / data.maxScore) * 100;
  }, [data]);

  const avgQuestionScore = useMemo(() => {
    if (scoredAnswers.length === 0) return 0;
    const total = scoredAnswers.reduce((sum, a) => sum + a.scorePercent, 0);
    return total / scoredAnswers.length;
  }, [scoredAnswers]);

  const scoreDistribution = useMemo<ScoreDistributionBucket[]>(() => {
    const buckets: ScoreDistributionBucket[] = [
      { label: 'Отлично', range: '80–100', min: 80, max: 101, count: 0, color: '#0d9488', bgColor: 'bg-teal-500', textColor: 'text-teal-600 dark:text-teal-400' },
      { label: 'Хорошо', range: '60–79', min: 60, max: 80, count: 0, color: '#059669', bgColor: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Удовлетворительно', range: '40–59', min: 40, max: 60, count: 0, color: '#d97706', bgColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
      { label: 'Слабо', range: '20–39', min: 20, max: 40, count: 0, color: '#ea580c', bgColor: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
      { label: 'Критично', range: '0–19', min: 0, max: 20, count: 0, color: '#dc2626', bgColor: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
    ];
    scoredAnswers.forEach((a) => {
      const bucket = buckets.find((b) => a.scorePercent >= b.min && a.scorePercent < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [scoredAnswers]);

  const lowScoredAnswers = useMemo(() => {
    return scoredAnswers.filter((a) => a.scorePercent < 60).sort((a, b) => a.scorePercent - b.scorePercent);
  }, [scoredAnswers]);

  const recommendations = useMemo(() => {
    return generateRecommendations(lowScoredAnswers, scoredAnswers.length);
  }, [lowScoredAnswers, scoredAnswers.length]);

  const trendIcon = useMemo(() => {
    if (overallPercent >= 60) return TrendingUp;
    if (overallPercent >= 40) return Minus;
    return TrendingDown;
  }, [overallPercent]);

  // ─── Print Handler ─────────────────────────────────────────────────────────

  const handlePrint = useCallback(() => {
    window.print();
    toast.success('Подготовка к печати...');
  }, []);

  const handleDownloadCSV = useCallback(() => {
    if (!data || scoredAnswers.length === 0) return;

    const BOM = '\uFEFF';
    const rows = [
      ['№', 'Вопрос', 'Тип ответа', 'Ответ', 'Балл', 'Комментарий'],
      ...scoredAnswers.map((a, i) => [
        i + 1,
        `"${a.question.text}"`,
        ANSWER_TYPE_LABELS[a.question.answerType] || a.question.answerType,
        `"${a.answer || '—'}"`,
        a.scorePercent.toFixed(1),
        `"${a.comment || '—'}"`,
      ]),
    ];
    const csv = BOM + rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${data.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV-файл скачан');
  }, [data, scoredAnswers]);

  // ─── Format Helpers ────────────────────────────────────────────────────────

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack} disabled>
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>
        <ReportSkeleton />
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ошибка загрузки отчёта</h3>
                <p className="text-sm text-muted-foreground mt-1">{error || 'Данные не найдены'}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Попробовать снова
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Computed Values ───────────────────────────────────────────────────────

  const template = data.assignment?.template;
  const auditor = data.assignment?.auditor;
  const TrendIcon = trendIcon;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Back Button & Actions */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden"
      >
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Назад к списку
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Печать
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadCSV}>
            <Download className="w-4 h-4" />
            Скачать CSV
          </Button>
        </div>
      </motion.div>

      {/* ═══════════════════════ HEADER SECTION ═══════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl print:rounded-lg"
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(135deg, ${
              overallPercent >= 80
                ? 'linear-gradient(135deg, #0d9488, #059669, #047857)'
                : overallPercent >= 60
                  ? 'linear-gradient(135deg, #059669, #0d9488, #0891b2)'
                  : overallPercent >= 40
                    ? 'linear-gradient(135deg, #d97706, #ea580c, #f59e0b)'
                    : 'linear-gradient(135deg, #dc2626, #ea580c, #ef4444)'
            })`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: overallPercent >= 80
              ? 'linear-gradient(135deg, #0f766e 0%, #065f46 50%, #064e3b 100%)'
              : overallPercent >= 60
                ? 'linear-gradient(135deg, #065f46 0%, #0f766e 50%, #155e75 100%)'
                : overallPercent >= 40
                  ? 'linear-gradient(135deg, #92400e 0%, #9a3412 50%, #b45309 100%)'
                  : 'linear-gradient(135deg, #991b1b 0%, #9a3412 50%, #b91c1c 100%)',
          }}
        />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative p-6 md:p-8 print:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            {/* Left: Info */}
            <div className="flex-1 space-y-4 text-white">
              <div className="flex items-center gap-2 text-white/70">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Отчёт аудита</span>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                  {data.status === 'COMPLETED' ? 'Завершён' : data.status}
                </Badge>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                {template?.title || 'Аудит'}
              </h1>

              {template?.category && (
                <Badge variant="secondary" className="bg-white/15 text-white/90 border-0 backdrop-blur-sm">
                  {template.category}
                </Badge>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{auditor?.name || 'Не указан'}</span>
                  {auditor?.department && (
                    <span className="text-white/50">· {auditor.department}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(data.completedAt)}</span>
                  {data.completedAt && (
                    <span className="text-white/50">в {formatTime(data.completedAt)}</span>
                  )}
                </div>
                {data.startedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span className="text-white/60">
                      Начат: {formatDate(data.startedAt)} {formatTime(data.startedAt)}
                    </span>
                  </div>
                )}
              </div>

              {data.notes && (
                <p className="text-sm text-white/70 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm max-w-xl">
                  {data.notes}
                </p>
              )}
            </div>

            {/* Right: Score Gauge */}
            <div className="flex items-center justify-center shrink-0 print:shrink">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 print:bg-white/20 print:p-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Итоговый балл</span>
                  <div className="bg-white rounded-full p-1">
                    <ScoreGauge percent={overallPercent} size={140} strokeWidth={10} />
                  </div>
                  <div className="flex items-center gap-1 text-white/70 text-xs">
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>
                      {data.score} из {data.maxScore} баллов
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════ STATS CARDS ═══════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 print:grid-cols-5 print:gap-2">
        {[
          {
            label: 'Всего вопросов',
            value: scoredAnswers.length,
            icon: BarChart3,
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-50 dark:bg-slate-950/40',
          },
          {
            label: 'Средний балл',
            value: avgQuestionScore.toFixed(1) + '%',
            icon: Target,
            color: getScoreColorClass(avgQuestionScore),
            bg: 'bg-muted/50',
          },
          {
            label: 'Отличных (>80)',
            value: scoreDistribution[0].count,
            icon: Award,
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-950/40',
          },
          {
            label: 'Проблемных (<40)',
            value: scoreDistribution[3].count + scoreDistribution[4].count,
            icon: AlertTriangle,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/40',
          },
          {
            label: 'Без ответа',
            value: scoredAnswers.filter((a) => !a.answer || a.answer.trim().length === 0).length,
            icon: Minus,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card className={`${stat.bg} print:shadow-none print:border`}>
                <CardContent className="p-3 md:p-4 print:p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground truncate print:text-[10px]">{stat.label}</span>
                  </div>
                  <div className={`text-xl md:text-2xl font-bold ${stat.color} print:text-lg`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════ QUESTION BREAKDOWN TABLE ═════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-500" />
              Детализация по вопросам
            </CardTitle>
            <CardDescription>
              Подробные результаты по каждому вопросу аудита
              {scoredAnswers.length > 0 && (
                <span className="ml-2">
                  · Средний балл: <span className="font-semibold">{avgQuestionScore.toFixed(1)}%</span>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6 print:p-3">
            <ScrollArea className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent print:hover:bg-transparent">
                    <TableHead className="w-12 text-center print:text-xs">№</TableHead>
                    <TableHead className="min-w-[200px] print:text-xs">Вопрос</TableHead>
                    <TableHead className="w-36 hidden md:table-cell print:text-xs">Тип</TableHead>
                    <TableHead className="w-40 print:text-xs">Ответ</TableHead>
                    <TableHead className="w-28 text-center print:text-xs">Балл</TableHead>
                    <TableHead className="w-48 hidden lg:table-cell print:text-xs">Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {scoredAnswers.map((answer, idx) => {
                      const badge = getScoreBadgeStyle(answer.scorePercent);
                      const rowBorder = getScoreRowBorder(answer.scorePercent);
                      const rowBg = getScoreRowBg(answer.scorePercent);
                      const isLow = answer.scorePercent < 40;

                      return (
                        <motion.tr
                          key={answer.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.02 }}
                          className={`${rowBorder} ${rowBg} hover:bg-muted/30 print:hover:bg-transparent print:opacity-100`}
                        >
                          <TableCell className="text-center font-medium text-muted-foreground print:text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium print:text-xs">
                            <div className="flex items-start gap-2">
                              {isLow && (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 print:hidden" />
                              )}
                              <span>{answer.question.text}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell print:text-xs">
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap print:border print:border-gray-300">
                              {ANSWER_TYPE_LABELS[answer.question.answerType] || answer.question.answerType}
                            </Badge>
                          </TableCell>
                          <TableCell className="print:text-xs">
                            <span className={answer.answer ? 'text-foreground' : 'text-muted-foreground italic'}>
                              {answer.answer || 'Без ответа'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center print:text-xs">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${getScoreColorClass(answer.scorePercent)}`}>
                                {answer.scorePercent.toFixed(1)}%
                              </span>
                              <Progress
                                value={answer.scorePercent}
                                className="h-1.5 w-16 print:h-1"
                                style={{
                                  // Override CSS variable for progress bar color
                                  '--progress-color': getScoreColor(answer.scorePercent),
                                } as React.CSSProperties}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell print:text-xs">
                            {answer.comment ? (
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {answer.comment}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ScrollArea>

            {scoredAnswers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Нет ответов для отображения</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════ DISTRIBUTION & RECOMMENDATIONS ═════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {/* Score Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                Распределение баллов
              </CardTitle>
              <CardDescription>Группировка вопросов по диапазонам оценок</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreDistributionBar distribution={scoreDistribution} />

              <Separator className="my-4" />

              {/* Visual bar */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Визуальная шкала</span>
                <div className="flex h-3 w-full rounded-full overflow-hidden">
                  {scoreDistribution.map((bucket) => (
                    <motion.div
                      key={bucket.label}
                      className="h-full"
                      style={{ backgroundColor: bucket.color }}
                      initial={{ flex: 0 }}
                      animate={{
                        flex: scoredAnswers.length > 0
                          ? bucket.count / scoredAnswers.length
                          : 0,
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Рекомендации
              </CardTitle>
              <CardDescription>
                Автоматически сгенерированные на основе результатов аудита
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors print:bg-gray-50 print:p-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-500 print:hidden" />
                    <p className="text-sm leading-relaxed print:text-xs">
                      {rec}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════ NOTES / COMMENTS SECTION ══════════════════════ */}
      {(data.notes || lowScoredAnswers.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Заметки и замечания
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Общие заметки аудитора</p>
                  <p className="text-sm">{data.notes}</p>
                </div>
              )}

              {lowScoredAnswers.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Комментарии к низкобалльным вопросам ({lowScoredAnswers.length}):
                  </p>
                  {lowScoredAnswers.slice(0, 10).map((answer) => (
                    <div
                      key={answer.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        answer.scorePercent < 20
                          ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
                          : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      } print:bg-gray-50`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{answer.question.text}</p>
                          {answer.comment ? (
                            <p className="text-xs text-muted-foreground mt-1">{answer.comment}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic mt-1">
                              Комментарий отсутствует
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] px-1.5 py-0 border-0 ${getScoreBadgeStyle(answer.scorePercent).bg} ${getScoreBadgeStyle(answer.scorePercent).text}`}
                        >
                          {answer.scorePercent.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════ FOOTER ════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="print:block hidden"
      >
        <Separator className="my-4" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>AuditPro — Система управления аудитами</span>
          <span>Отчёт сгенерирован: {new Date().toLocaleDateString('ru-RU')}</span>
        </div>
      </motion.div>
    </div>
  );
}
