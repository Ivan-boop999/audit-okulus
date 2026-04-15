'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, ClipboardCheck, Calendar, FileText,
  BarChart3, Clock, CheckCircle2, AlertTriangle,
  Download, Wrench, Cpu, BriefcaseConveyorBelt, Thermometer,
  Gauge, Zap, Factory, Package, Hash, ArrowUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Equipment {
  id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  description: string | null;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateRel {
  id: string;
  templateId: string;
  equipmentId: string;
  template: {
    id: string;
    title: string;
    category: string;
    status: string;
    frequency: string | null;
    questions?: { id: string }[];
  };
}

interface Template {
  id: string;
  title: string;
  category: string;
  status: string;
  frequency: string | null;
  questions?: { id: string }[];
  equipment?: TemplateRel[];
  _count?: { assignments: number };
}

interface Assignment {
  id: string;
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  template: {
    id: string;
    title: string;
    category: string;
  };
  auditor: {
    id: string;
    name: string;
    email: string;
  };
  responses: {
    id: string;
    score: number | null;
    maxScore: number | null;
    status: string;
    completedAt: string | null;
    startedAt: string;
  }[];
}

interface EquipmentDetailProps {
  equipmentId: string;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryIcons: Record<string, React.ElementType> = {
  'Пресс': Wrench,
  'Станок ЧПУ': Cpu,
  'Конвейер': BriefcaseConveyorBelt,
  'Термопластавтомат': Thermometer,
  'Измерительный прибор': Gauge,
  'Генератор': Zap,
  'Сварочный аппарат': Factory,
  'Компрессор': Gauge,
  'Насос': Factory,
  'Вентиляция': Factory,
  'Другое': Package,
};

const categoryColors: Record<string, string> = {
  'Пресс': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
  'Станок ЧПУ': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400',
  'Конвейер': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
  'Термопластавтомат': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
  'Измерительный прибор': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400',
  'Генератор': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400',
  'Сварочный аппарат': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400',
  'Компрессор': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
  'Насос': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400',
  'Вентиляция': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400',
  'Другое': 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400',
};

const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  ACTIVE: {
    label: 'Активно',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Неактивно',
    color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    dotColor: 'bg-slate-400',
  },
  MAINTENANCE: {
    label: 'Обслуживание',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    dotColor: 'bg-amber-500',
  },
  OPERATIONAL: {
    label: 'Работает',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  OUT_OF_SERVICE: {
    label: 'Не работает',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple deterministic hash from a string → number */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit int
  }
  return Math.abs(hash);
}

/** Generate a deterministic QR-style grid pattern (SVG) from equipment code */
function generateQRPattern(code: string, gridSize = 13) {
  const cells: { x: number; y: number; filled: boolean }[] = [];
  const hash = hashCode(code);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Finder patterns (top-left, top-right, bottom-left 3x3 squares)
      const isFinderTL = row < 3 && col < 3;
      const isFinderTR = row < 3 && col >= gridSize - 3;
      const isFinderBL = row >= gridSize - 3 && col < 3;

      if (isFinderTL || isFinderTR || isFinderBL) {
        // Outer ring
        const inOuter =
          (isFinderTL && (row === 0 || row === 2 || col === 0 || col === 2)) ||
          (isFinderTR && (row === 0 || row === 2 || col === gridSize - 1 || col === gridSize - 3)) ||
          (isFinderBL && (row === gridSize - 1 || row === gridSize - 3 || col === 0 || col === 2));
        // Inner dot
        const inInner =
          (isFinderTL && row === 1 && col === 1) ||
          (isFinderTR && row === 1 && col === gridSize - 2) ||
          (isFinderBL && row === gridSize - 2 && col === 1);

        cells.push({ x: col, y: row, filled: inOuter || inInner });
      } else {
        // Deterministic based on hash and position
        const cellHash = hashCode(`${code}-${row}-${col}`);
        cells.push({ x: col, y: row, filled: cellHash % 3 !== 0 });
      }
    }
  }
  return cells;
}

function getScoreColorClass(percent: number): string {
  if (percent >= 80) return 'text-teal-600 dark:text-teal-400';
  if (percent >= 60) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 40) return 'text-amber-600 dark:text-amber-400';
  if (percent >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgClass(percent: number): string {
  if (percent >= 80) return 'bg-teal-50 dark:bg-teal-950/40';
  if (percent >= 60) return 'bg-emerald-50 dark:bg-emerald-950/40';
  if (percent >= 40) return 'bg-amber-50 dark:bg-amber-950/40';
  if (percent >= 20) return 'bg-orange-50 dark:bg-orange-950/40';
  return 'bg-red-50 dark:bg-red-950/40';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── QR-Style Badge Component ────────────────────────────────────────────────

function QRStyleBadge({ code }: { code: string }) {
  const gridSize = 13;
  const cellSize = 6;
  const padding = 12;
  const totalSize = gridSize * cellSize + padding * 2;
  const cells = generateQRPattern(code, gridSize);
  const CatIcon = categoryIcons['Другое'] || Package;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative"
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          {/* Decorative dot pattern behind QR */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }} />
          <svg
            width={totalSize}
            height={totalSize}
            viewBox={`0 0 ${totalSize} ${totalSize}`}
            className="block"
          >
            {cells.map((cell, i) => (
              <rect
                key={i}
                x={cell.x * cellSize + padding}
                y={cell.y * cellSize + padding}
                width={cellSize}
                height={cellSize}
                rx={1}
                fill={cell.filled ? '#1e293b' : '#e2e8f0'}
                className="dark:fill-slate-700 dark:[fill=#334155]"
                style={cell.filled ? { fill: undefined } : {}}
              />
            ))}
            {/* Dark mode override for unfilled */}
            <style>{`.dark rect { fill: transparent; } .dark rect[fill="#1e293b"] { fill: #1e293b; } .dark rect[fill="#e2e8f0"] { fill: #334155; }`}</style>
          </svg>
        </div>
      </motion.div>
      <div className="text-center">
        <span className="font-mono text-sm font-semibold tracking-wider text-foreground">
          {code}
        </span>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled>
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Button>

      {/* Header skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/80 to-muted p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-72" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center justify-center">
            <Skeleton className="h-[110px] w-[110px] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EquipmentDetail({ equipmentId, onBack }: EquipmentDetailProps) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const auditTableRef = useRef<HTMLDivElement>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/equipment').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/templates').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/assignments').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([eqData, tplData, asnData]) => {
        if (cancelled) return;
        const eq = (eqData as Equipment[]).find(e => e.id === equipmentId);
        if (!eq) throw new Error('Equipment not found');
        setEquipment(eq);
        setTemplates(tplData as Template[]);
        setAssignments(asnData as Assignment[]);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить данные об оборудовании');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [equipmentId]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const linkedTemplates = useMemo(() => {
    if (!equipment) return [];
    const equipmentTemplateIds = new Set(
      (equipment as Equipment & { auditTemplates?: TemplateRel[] }).auditTemplates?.map(
        (rel: TemplateRel) => rel.templateId
      ) || []
    );
    return templates.filter(t => equipmentTemplateIds.has(t.id));
  }, [equipment, templates]);

  const linkedTemplateIds = useMemo(
    () => new Set(linkedTemplates.map(t => t.id)),
    [linkedTemplates]
  );

  const completedAssignments = useMemo(() => {
    return assignments
      .filter(a => linkedTemplateIds.has(a.templateId) && a.status === 'COMPLETED')
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }, [assignments, linkedTemplateIds]);

  const recentAudits = useMemo(() => {
    return completedAssignments
      .filter(a => a.responses.length > 0)
      .slice(0, 5);
  }, [completedAssignments]);

  const totalAudits = completedAssignments.length;

  const lastAuditDate = useMemo(() => {
    const latest = completedAssignments[0];
    return latest ? formatDate(latest.scheduledDate) : '—';
  }, [completedAssignments]);

  const activeTemplatesCount = linkedTemplates.filter(t => t.status === 'ACTIVE').length;

  // ─── Export handler ─────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!equipment) return;

    const BOM = '\uFEFF';
    const rows = [
      ['Поле', 'Значение'],
      ['Название', `"${equipment.name}"`],
      ['Код', equipment.code],
      ['Категория', equipment.category],
      ['Расположение', equipment.location],
      ['Статус', equipment.status],
      ['Описание', `"${equipment.description || ''}"`],
      ['Всего аудитов', String(totalAudits)],
      ['Последний аудит', lastAuditDate],
      ['Связанных шаблонов', String(linkedTemplates.length)],
      ['', ''],
      ['История аудитов', ''],
      ['Шаблон', 'Аудитор', 'Дата', 'Статус', 'Балл'],
    ];

    recentAudits.forEach(a => {
      const resp = a.responses[0];
      const score = resp?.score !== null && resp?.maxScore !== null && resp.maxScore > 0
        ? `${((resp.score / resp.maxScore) * 100).toFixed(1)}%`
        : '—';
      rows.push([
        `"${a.template.title}"`,
        `"${a.auditor.name}"`,
        formatDate(a.scheduledDate),
        a.status,
        score,
      ]);
    });

    const csv = BOM + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-${equipment.code}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV-файл экспортирован');
  };

  // ─── Loading / Error States ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack} disabled>
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Назад к списку
        </Button>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ошибка загрузки</h3>
                <p className="text-sm text-muted-foreground mt-1">{error || 'Оборудование не найдено'}</p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                Попробовать снова
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const CatIcon = categoryIcons[equipment.category] || Package;
  const catColor = categoryColors[equipment.category] || categoryColors['Другое'];
  const statusCfg = statusConfig[equipment.status] || statusConfig.ACTIVE;

  // Gradient colors based on status
  const gradientColors = equipment.status === 'ACTIVE'
    ? 'from-emerald-700 via-teal-800 to-emerald-900'
    : equipment.status === 'MAINTENANCE'
      ? 'from-amber-700 via-orange-800 to-amber-900'
      : 'from-slate-700 via-slate-800 to-slate-900';

  return (
    <div className="space-y-6">
      {/* Back Button & Actions */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к оборудованию
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Экспорт CSV
          </Button>
        </div>
      </motion.div>

      {/* ═══════════════════════ HEADER SECTION ═══════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors}`} />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.02]" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            {/* Left: Info */}
            <div className="flex-1 space-y-4 text-white">
              <div className="flex items-center gap-2 text-white/70">
                <CatIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{equipment.category}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                {equipment.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs font-mono">
                  {equipment.code}
                </Badge>
                <Badge variant="secondary" className={`border ${catColor}`}>
                  {equipment.category}
                </Badge>
                <Badge variant="secondary" className="bg-white/15 text-white/90 border-0 backdrop-blur-sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                  {statusCfg.label}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <MapPin className="w-4 h-4" />
                <span>{equipment.location}</span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Добавлено: {formatDate(equipment.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Обновлено: {formatDate(equipment.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Right: QR-Style Badge */}
            <div className="flex items-center justify-center shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wider block text-center mb-4">
                  Идентификатор
                </span>
                <QRStyleBadge code={equipment.code} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════ STATS CARDS ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Всего аудитов',
            value: totalAudits,
            icon: ClipboardCheck,
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/20',
            borderColor: 'border-slate-200 dark:border-slate-800',
          },
          {
            label: 'Последний аудит',
            value: lastAuditDate,
            icon: Calendar,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
          },
          {
            label: 'Активных шаблонов',
            value: activeTemplatesCount,
            icon: FileText,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <Card className={`${stat.bg} border ${stat.borderColor} stat-card-glow card-shine hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className={`text-xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════ MAIN CONTENT ══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Audit History + Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Audit History */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                  Последние аудиты
                </CardTitle>
                <CardDescription>
                  5 последних завершённых проверок по связанным шаблонам
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 md:p-6">
                {recentAudits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ClipboardCheck className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">Завершённых аудитов пока нет</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Шаблон</TableHead>
                          <TableHead className="hidden sm:table-cell">Аудитор</TableHead>
                          <TableHead className="hidden md:table-cell">Дата</TableHead>
                          <TableHead className="text-center">Балл</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentAudits.map((audit, idx) => {
                          const resp = audit.responses[0];
                          const scorePercent = resp?.score !== null && resp?.maxScore !== null && resp.maxScore > 0
                            ? (resp.score / resp.maxScore) * 100
                            : null;

                          return (
                            <motion.tr
                              key={audit.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.35 + idx * 0.04 }}
                              className="hover:bg-muted/30"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm truncate max-w-[160px]">
                                    {audit.template.title}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="text-sm text-muted-foreground">
                                  {audit.auditor.name}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(audit.scheduledDate)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {scorePercent !== null ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-semibold ${getScoreBgClass(scorePercent)} ${getScoreColorClass(scorePercent)} border-0`}
                                  >
                                    {scorePercent.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Description */}
          {equipment.description && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-500" />
                    Описание
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {equipment.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right: Linked Templates */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Связанные шаблоны
              </CardTitle>
              <CardDescription>
                Шаблоны аудитов, привязанные к этому оборудованию
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-3 stagger-children">
                {linkedTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">Нет связанных шаблонов</p>
                  </div>
                ) : (
                  linkedTemplates.map((tpl, idx) => {
                    const tplCatColor = categoryColors[tpl.category] || categoryColors['Другое'];
                    const questionCount = tpl.questions?.length || 0;

                    return (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + idx * 0.05 }}
                        className="p-3 rounded-lg border border-border hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all duration-200 bg-background"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{tpl.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={`text-[10px] ${tplCatColor}`}>
                                {tpl.category}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                {questionCount} {questionCount === 1 ? 'вопрос' : questionCount < 5 ? 'вопроса' : 'вопросов'}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${
                              tpl.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {tpl.status === 'ACTIVE' ? 'Активен' : tpl.status === 'DRAFT' ? 'Черновик' : 'Архив'}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════ ALL AUDITS TABLE ══════════════════════════════ */}
      {completedAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="relative"
        >
          {/* Back to top floating button */}
          <motion.button
            onClick={() => auditTableRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`back-to-top fixed bottom-24 right-8 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:bg-primary/90 ${showBackToTop ? 'visible' : 'hidden'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Наверх"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                Полная история аудитов
              </CardTitle>
              <CardDescription>
                Все завершённые проверки ({completedAssignments.length})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <div
                ref={auditTableRef}
                className="max-h-96 overflow-y-auto custom-scrollbar"
                onScroll={(e) => setShowBackToTop(e.currentTarget.scrollTop > 200)}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Шаблон</TableHead>
                      <TableHead className="hidden sm:table-cell">Аудитор</TableHead>
                      <TableHead className="hidden md:table-cell">Дата</TableHead>
                      <TableHead className="text-center">Балл</TableHead>
                      <TableHead className="hidden lg:table-cell">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedAssignments.map((audit, idx) => {
                      const resp = audit.responses[0];
                      const scorePercent = resp?.score !== null && resp?.maxScore !== null && resp.maxScore > 0
                        ? (resp.score / resp.maxScore) * 100
                        : null;

                      return (
                        <motion.tr
                          key={audit.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.03 }}
                          className="hover:bg-muted/30"
                        >
                          <TableCell>
                            <span className="font-medium text-sm">{audit.template.title}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">{audit.auditor.name}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{formatDate(audit.scheduledDate)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {scorePercent !== null ? (
                              <span className={`text-sm font-bold ${getScoreColorClass(scorePercent)}`}>
                                {scorePercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Завершён
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
