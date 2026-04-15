'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  History, Download, ChevronDown, ChevronUp, Trophy, TrendingUp,
  Calendar, Filter, Star, CheckCircle2, Clock, AlertTriangle,
  BarChart3, X, ArrowUpDown, FileText, MessageSquare,
  User, Search, ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditHistoryProps {
  userId?: string;
  isAdmin?: boolean;
}

interface Auditor {
  id: string;
  name: string;
  email: string;
  department?: string | null;
}

interface Template {
  id: string;
  title: string;
  category: string;
  status: string;
  frequency?: string | null;
  questions?: Question[];
}

interface Question {
  id: string;
  text: string;
  answerType: string;
  weight: number;
  order: number;
  helpText?: string | null;
  options?: string | null;
}

interface QuestionAnswer {
  id: string;
  questionId: string;
  answer?: string | null;
  comment?: string | null;
  photoUrl?: string | null;
}

interface AuditResponse {
  id: string;
  assignmentId: string;
  auditorId: string;
  startedAt: string;
  completedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
  status: string;
  notes?: string | null;
  answers: QuestionAnswer[];
}

interface AuditAssignment {
  id: string;
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  template: Template;
  auditor: Auditor;
  responses: AuditResponse[];
}

interface CompletedAudit extends AuditAssignment {
  latestResponse: AuditResponse;
  score: number | null;
  completedAt: string | null;
  duration: string;
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function getScoreColor(score: number | null | undefined): {
  bar: string;
  bg: string;
  text: string;
  label: string;
} {
  if (score == null) return { bar: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600', text: 'text-slate-500', label: 'Нет данных' };
  if (score >= 80) return { bar: 'bg-emerald-500', bg: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', label: 'Отлично' };
  if (score >= 60) return { bar: 'bg-amber-500', bg: 'bg-amber-100 text-amber-700', text: 'text-amber-600', label: 'Удовлетворительно' };
  return { bar: 'bg-red-500', bg: 'bg-red-100 text-red-700', text: 'text-red-600', label: 'Требует внимания' };
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: ru });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: ru });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAnswerDisplay(answer: string | null | undefined, answerType: string): string {
  if (!answer) return 'Не указан';
  switch (answerType) {
    case 'YES_NO':
      return answer === 'yes' ? 'Да ✓' : 'Нет ✗';
    case 'SCALE_1_5':
    case 'SCALE_1_10':
      return `${answer}/10`;
    default:
      return answer;
  }
}

function formatDuration(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) return '—';
  const mins = differenceInMinutes(parseISO(completedAt), parseISO(startedAt));
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditHistory({ userId, isAdmin = false }: AuditHistoryProps) {
  // Data state
  const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterScoreRange, setFilterScoreRange] = useState('all');
  const [filterAuditor, setFilterAuditor] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'score' | 'template'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<CompletedAudit | null>(null);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', 'COMPLETED');
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/assignments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssignments(data);
    } catch {
      toast.error('Не удалось загрузить историю аудитов');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ─── Derived Data ────────────────────────────────────────────────────────

  // Extract completed audits with their latest response
  const completedAudits = useMemo((): CompletedAudit[] => {
    return assignments
      .filter((a) => {
        if (a.status !== 'COMPLETED' || a.responses.length === 0) return false;
        const latestResponse = a.responses[a.responses.length - 1];
        return latestResponse.completedAt;
      })
      .map((a): CompletedAudit => {
        const latestResponse = a.responses[a.responses.length - 1];
        return {
          ...a,
          latestResponse,
          score: latestResponse.score ?? null,
          completedAt: latestResponse.completedAt ?? null,
          duration: formatDuration(latestResponse.startedAt, latestResponse.completedAt),
        };
      });
  }, [assignments]);

  // Unique templates
  const templates = useMemo(() => {
    const map = new Map<string, Template>();
    completedAudits.forEach((a) => {
      if (a.template && !map.has(a.template.id)) {
        map.set(a.template.id, a.template);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [completedAudits]);

  // Unique auditors
  const auditors = useMemo(() => {
    const map = new Map<string, Auditor>();
    completedAudits.forEach((a) => {
      if (a.auditor && !map.has(a.auditor.id)) {
        map.set(a.auditor.id, a.auditor);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [completedAudits]);

  // Statistics
  const stats = useMemo(() => {
    const scores = completedAudits.map((a) => a.score).filter((s): s is number => s != null);
    if (scores.length === 0) {
      return { total: 0, avgScore: 0, bestScore: 0, worstScore: 0 };
    }
    return {
      total: completedAudits.length,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
    };
  }, [completedAudits]);

  // Filtered & sorted
  const filteredAudits = useMemo(() => {
    let items = [...completedAudits];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.template?.title?.toLowerCase().includes(q) ||
          a.auditor?.name?.toLowerCase().includes(q) ||
          a.auditor?.department?.toLowerCase().includes(q) ||
          a.latestResponse?.notes?.toLowerCase().includes(q),
      );
    }

    // Date range
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      items = items.filter((a) => a.completedAt && new Date(a.completedAt) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      items = items.filter((a) => a.completedAt && new Date(a.completedAt) <= to);
    }

    // Template
    if (filterTemplate !== 'all') {
      items = items.filter((a) => a.templateId === filterTemplate);
    }

    // Score range
    if (filterScoreRange !== 'all') {
      const [min, max] = filterScoreRange.split('-').map(Number);
      items = items.filter((a) => a.score != null && a.score >= min && a.score <= max);
    }

    // Auditor (admin only)
    if (filterAuditor !== 'all') {
      items = items.filter((a) => a.auditorId === filterAuditor);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = (a.completedAt ? new Date(a.completedAt).getTime() : 0) - (b.completedAt ? new Date(b.completedAt).getTime() : 0);
      else if (sortField === 'score') cmp = (a.score ?? 0) - (b.score ?? 0);
      else if (sortField === 'template') cmp = (a.template?.title || '').localeCompare(b.template?.title || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [completedAudits, searchQuery, filterDateFrom, filterDateTo, filterTemplate, filterScoreRange, filterAuditor, sortField, sortDir]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterDateFrom ||
    filterDateTo ||
    filterTemplate !== 'all' ||
    filterScoreRange !== 'all' ||
    filterAuditor !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTemplate('all');
    setFilterScoreRange('all');
    setFilterAuditor('all');
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    if (filteredAudits.length === 0) {
      toast.warning('Нет данных для экспорта');
      return;
    }

    const headers = [
      'Дата завершения',
      'Шаблон',
      'Категория',
      'Аудитор',
      'Отдел',
      'Оценка (%)',
      'Статус оценки',
      'Длительность',
      'Заметки',
    ];

    const rows = filteredAudits.map((a) => [
      formatDateTime(a.completedAt),
      a.template?.title || '',
      a.template?.category || '',
      a.auditor?.name || '',
      a.auditor?.department || '',
      a.score != null ? a.score.toFixed(1) : '',
      getScoreColor(a.score).label,
      a.duration,
      a.latestResponse?.notes?.replace(/[\n\r]/g, ' ') || '',
    ]);

    const csvContent = [
      '\uFEFF' + headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Файл CSV успешно загружен');
  }, [filteredAudits]);

  // ─── Detail Dialog ───────────────────────────────────────────────────────

  const openDetail = (audit: CompletedAudit) => {
    setSelectedAudit(audit);
    setDetailOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            История аудитов
          </h1>
          <p className="text-muted-foreground mt-1">
            {userId ? 'Ваши завершённые аудиты и результаты' : 'Все завершённые аудиты с подробными результатами'}
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
          disabled={filteredAudits.length === 0}
        >
          <Download className="w-4 h-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* Statistics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.35 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Всего завершено</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Средний балл</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.total > 0 ? stats.bestScore.toFixed(1) : '—'}%</div>
                  <div className="text-xs text-muted-foreground">Лучший результат</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.total > 0 ? stats.worstScore.toFixed(1) : '—'}%</div>
                  <div className="text-xs text-muted-foreground">Худший результат</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по шаблону, аудитору, заметкам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
              {/* Template Filter */}
              <Select value={filterTemplate} onValueChange={setFilterTemplate}>
                <SelectTrigger className="w-full lg:w-[200px] h-10">
                  <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Шаблон" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все шаблоны</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="truncate">{t.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Score Range Filter */}
              <Select value={filterScoreRange} onValueChange={setFilterScoreRange}>
                <SelectTrigger className="w-full lg:w-[180px] h-10">
                  <Star className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Оценка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все оценки</SelectItem>
                  <SelectItem value="0-59">Требует внимания (0–59)</SelectItem>
                  <SelectItem value="60-79">Удовлетворительно (60–79)</SelectItem>
                  <SelectItem value="80-100">Отлично (80–100)</SelectItem>
                </SelectContent>
              </Select>

              {/* Auditor Filter (admin only) */}
              {isAdmin && (
                <Select value={filterAuditor} onValueChange={setFilterAuditor}>
                  <SelectTrigger className="w-full lg:w-[220px] h-10">
                    <User className="w-4 h-4 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Аудитор" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все аудиторы</SelectItem>
                    {auditors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center">
                            {getInitials(a.name)}
                          </span>
                          <span className="truncate">{a.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Date From */}
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full lg:w-[170px] h-10"
              />

              {/* Date To */}
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full lg:w-[170px] h-10"
              />

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="w-4 h-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Сортировка:
        </span>
        {[
          { field: 'date' as const, label: 'Дата' },
          { field: 'score' as const, label: 'Оценка' },
          { field: 'template' as const, label: 'Шаблон' },
        ].map((opt) => (
          <Button
            key={opt.field}
            variant={sortField === opt.field ? 'default' : 'outline'}
            size="sm"
            className={`h-8 text-xs gap-1 ${
              sortField === opt.field
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }`}
            onClick={() => toggleSort(opt.field)}
          >
            {opt.label}
            {sortField === opt.field && (
              <motion.span
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: sortDir === 'asc' ? 0 : 180, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="w-3 h-3" />
              </motion.span>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="shimmer h-4 w-3/4 rounded mb-3" />
                <div className="shimmer h-3 w-1/2 rounded mb-2" />
                <div className="shimmer h-6 w-full rounded mb-2" />
                <div className="shimmer h-3 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAudits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground">Нет завершённых аудитов</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters || searchQuery
              ? 'Попробуйте изменить параметры поиска или фильтры'
              : 'Завершённые аудиты появятся здесь после прохождения проверок'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Audit Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredAudits.map((audit) => {
                const scoreCfg = getScoreColor(audit.score);
                const isExpanded = expandedId === audit.id;

                return (
                  <motion.div
                    key={audit.id}
                    variants={itemVariants}
                    exit="exit"
                    layout
                  >
                    <Card
                      className={`overflow-hidden transition-all duration-300 hover:shadow-md border ${
                        isExpanded
                          ? 'ring-2 ring-emerald-500/30 border-emerald-300 dark:border-emerald-700'
                          : 'hover:border-emerald-200 dark:hover:border-emerald-800'
                      }`}
                    >
                      {/* Score Color Strip */}
                      <div className={`h-1 ${scoreCfg.bar}`} />

                      {/* Main Row */}
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-4">
                            {/* Template Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm sm:text-base truncate">
                                  {audit.template?.title || 'Шаблон'}
                                </h3>
                                <Badge variant="outline" className="text-[10px] flex-shrink-0 bg-muted/50">
                                  {audit.template?.category}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <User className="w-3 h-3" />
                                  {audit.auditor?.name || 'Не указан'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(audit.completedAt)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {audit.duration}
                                </span>
                              </div>
                            </div>

                            {/* Score + Chevron */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Circular Score Indicator */}
                              <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-muted/30"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke={audit.score != null ? (audit.score >= 80 ? '#10b981' : audit.score >= 60 ? '#f59e0b' : '#ef4444') : '#94a3b8'}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - ((audit.score ?? 0) / 100))}`}
                                    className="transition-all duration-700 ease-out"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-xs font-bold ${scoreCfg.text}`}>
                                    {audit.score != null ? Math.round(audit.score) : '—'}
                                  </span>
                                </div>
                              </div>

                              {/* Expand Chevron */}
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Score Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${scoreCfg.bg}`}>
                                {scoreCfg.label}
                              </span>
                              <span className={`text-xs font-semibold ${scoreCfg.text}`}>
                                {audit.score != null ? audit.score.toFixed(1) : '—'}%
                              </span>
                            </div>
                            <Progress
                              value={audit.score ?? 0}
                              className="h-2"
                            />
                          </div>
                        </CardContent>
                      </button>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <Separator />
                            <div className="p-4 sm:p-5 space-y-4">
                              {/* Response Notes */}
                              {audit.latestResponse?.notes && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Комментарий аудитора
                                  </div>
                                  <p className="text-sm">{audit.latestResponse.notes}</p>
                                </div>
                              )}

                              {/* Questions & Answers */}
                              {audit.template?.questions && audit.template.questions.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    Вопросы и ответы ({audit.template.questions.length})
                                  </h4>

                                  {audit.template.questions
                                    .sort((a, b) => a.order - b.order)
                                    .map((question, idx) => {
                                      const answer = audit.latestResponse?.answers?.find(
                                        (ans) => ans.questionId === question.id,
                                      );
                                      const answerText = getAnswerDisplay(answer?.answer, question.answerType);
                                      const isYesNo = question.answerType === 'YES_NO';
                                      const isPositive = answer?.answer === 'yes';

                                      return (
                                        <div
                                          key={question.id}
                                          className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground mt-0.5">
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                              <p className="text-sm font-medium leading-relaxed">
                                                {question.text}
                                                {question.helpText && (
                                                  <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                                                    {question.helpText}
                                                  </span>
                                                )}
                                              </p>

                                              {/* Answer */}
                                              <div className="flex items-center gap-2">
                                                {isYesNo ? (
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[11px] gap-1 ${
                                                      isPositive
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}
                                                  >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {answerText}
                                                  </Badge>
                                                ) : (
                                                  <span className="text-sm font-medium text-foreground">
                                                    {answerText}
                                                  </span>
                                                )}
                                                {question.weight > 0 && (
                                                  <span className="text-[10px] text-muted-foreground">
                                                    Вес: {question.weight}
                                                  </span>
                                                )}
                                              </div>

                                              {/* Comment */}
                                              {answer?.comment && (
                                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                                                  <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                  <span>{answer.comment}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}

                              {/* Open Full Detail Dialog */}
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetail(audit);
                                  }}
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  Подробнее
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground text-right">
            Показано {filteredAudits.length} из {completedAudits.length} записей
          </div>
        </>
      )}

      {/* ─── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  {selectedAudit.template?.title || 'Аудит'}
                </DialogTitle>
                <DialogDescription>
                  Подробные результаты аудита от {selectedAudit.auditor?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Audit Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Аудитор</div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center">
                        {getInitials(selectedAudit.auditor?.name || '??')}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{selectedAudit.auditor?.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedAudit.auditor?.department}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Дата завершения</div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatDateTime(selectedAudit.latestResponse?.completedAt)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Длительность: {selectedAudit.latestResponse ? formatDuration(selectedAudit.latestResponse.startedAt, selectedAudit.latestResponse.completedAt) : '—'}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                      <circle
                        cx="32" cy="32" r="26" fill="none"
                        stroke={
                          (selectedAudit.latestResponse?.score ?? 0) >= 80 ? '#10b981' :
                          (selectedAudit.latestResponse?.score ?? 0) >= 60 ? '#f59e0b' : '#ef4444'
                        }
                        strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - ((selectedAudit.latestResponse?.score ?? 0) / 100))}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{selectedAudit.latestResponse?.score != null ? Math.round(selectedAudit.latestResponse.score) : '—'}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold">{selectedAudit.latestResponse?.score != null ? `${selectedAudit.latestResponse.score.toFixed(1)}%` : '—'}</div>
                    <Badge variant="outline" className={`text-[11px] ${getScoreColor(selectedAudit.latestResponse?.score).bg}`}>
                      {getScoreColor(selectedAudit.latestResponse?.score).label}
                    </Badge>
                    <Progress value={selectedAudit.latestResponse?.score ?? 0} className="h-2 mt-2" />
                  </div>
                </div>

                {/* Notes */}
                {selectedAudit.latestResponse?.notes && (
                  <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Комментарий аудитора
                    </div>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">{selectedAudit.latestResponse.notes}</p>
                  </div>
                )}

                {/* Questions & Answers */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    Вопросы и ответы ({selectedAudit.template?.questions?.length ?? 0})
                  </h4>

                  {selectedAudit.template?.questions
                    ?.sort((a, b) => a.order - b.order)
                    .map((question, idx) => {
                      const answer = selectedAudit.latestResponse?.answers?.find(
                        (a) => a.questionId === question.id,
                      );
                      const isYesNo = question.answerType === 'YES_NO';
                      const isPositive = answer?.answer === 'yes';

                      return (
                        <motion.div
                          key={question.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border rounded-lg p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                              isYesNo
                                ? isPositive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-sm font-medium leading-relaxed">{question.text}</p>

                              <div className="flex items-center gap-2 flex-wrap">
                                {isYesNo ? (
                                  <Badge variant="outline" className={`text-[11px] gap-1 ${
                                    isPositive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {isPositive ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {answer?.answer === 'yes' ? 'Да' : answer?.answer === 'no' ? 'Нет' : 'Не указан'}
                                  </Badge>
                                ) : (
                                  <span className="text-sm bg-muted px-2 py-0.5 rounded font-medium">
                                    {getAnswerDisplay(answer?.answer, question.answerType)}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  {question.answerType.replace(/_/g, ' ')}
                                </Badge>
                                {question.weight > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    вес: {question.weight}
                                  </span>
                                )}
                              </div>

                              {answer?.comment && (
                                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                                  <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {answer.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
