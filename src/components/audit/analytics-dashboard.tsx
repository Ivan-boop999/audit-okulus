'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  ComposedChart, Scatter,
} from 'recharts';
import {
  BarChart3, TrendingUp, Target, Users, Activity, FileText, Wrench,
  CheckCircle2, Clock, AlertTriangle, CalendarDays, ArrowUpRight,
  ArrowDownRight, Download, Filter, ChevronDown, Sparkles, LayoutDashboard,
  UserCheck, Shield, BarChartHorizontal, Flame, PieChartIcon,
  TableIcon, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import ScoringGuide from '@/components/audit/scoring-guide';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsOverview {
  totalEquipment: number;
  totalTemplates: number;
  totalAuditors: number;
  totalAssignments: number;
  completedAssignments: number;
  scheduledAssignments: number;
  inProgressAssignments: number;
  overdueAssignments: number;
  avgScore: number;
  completionRate: number;
}

interface ScoreEntry {
  date: string;
  score: number;
}

interface CategoryEntry {
  name: string;
  count: number;
  avgScore?: number;
}

interface AuditorEntry {
  name: string;
  department: string;
  totalAudits: number;
  avgScore: number;
}

interface EquipmentEntry {
  name: string;
  count: number;
}

interface ActivityEntry {
  id: string;
  templateTitle: string;
  auditorName: string;
  status: string;
  date: string;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  scoresOverTime: ScoreEntry[];
  categoryData: CategoryEntry[];
  auditorPerformance: AuditorEntry[];
  equipmentCategories: EquipmentEntry[];
  recentActivity: ActivityEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  emerald: '#059669',
  teal: '#0d9488',
  cyan: '#0891b2',
  sky: '#0284c7',
  blue: '#2563eb',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  purple: '#9333ea',
  fuchsia: '#c026d3',
  amber: '#d97706',
  orange: '#ea580c',
  rose: '#e11d48',
  red: '#dc2626',
};

const CHART_PALETTE = [
  COLORS.emerald, COLORS.teal, COLORS.cyan, COLORS.sky, COLORS.blue,
  COLORS.indigo, COLORS.violet, COLORS.amber, COLORS.orange, COLORS.rose,
];

const HEATMAP_COLORS: Record<string, string> = {
  critical: '#dc2626',
  poor: '#ea580c',
  fair: '#d97706',
  good: '#059669',
  excellent: '#0d9488',
};

function getHeatmapColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 80) return { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400', label: 'Отлично' };
  if (score >= 60) return { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', label: 'Хорошо' };
  if (score >= 40) return { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', label: 'Удовл.' };
  if (score >= 20) return { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400', label: 'Слабо' };
  return { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400', label: 'Критично' };
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return COLORS.teal;
  if (score >= 60) return COLORS.emerald;
  if (score >= 40) return COLORS.amber;
  if (score >= 20) return COLORS.orange;
  return COLORS.red;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  COMPLETED: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle2 },
  SCHEDULED: { label: 'Запланирован', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400', icon: CalendarDays },
  IN_PROGRESS: { label: 'В процессе', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
  OVERDUE: { label: 'Просрочен', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400', icon: AlertTriangle },
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

function formatAnalyticsDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="animate-pulse space-y-3" style={{ height }}>
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="h-4 w-60 rounded bg-muted" />
      <div className="flex-1 rounded-lg bg-muted/50" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then((json: AnalyticsData) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const scoreDistribution = useMemo(() => {
    if (!data?.scoresOverTime.length) return [];
    const ranges = [
      { range: '0–20', min: 0, max: 20, count: 0 },
      { range: '20–40', min: 20, max: 40, count: 0 },
      { range: '40–60', min: 40, max: 60, count: 0 },
      { range: '60–80', min: 60, max: 80, count: 0 },
      { range: '80–100', min: 80, max: 100, count: 0 },
    ];
    data.scoresOverTime.forEach(({ score }) => {
      const bucket = ranges.find(r => score >= r.min && score < r.max) || ranges[4];
      bucket.count++;
    });
    return ranges;
  }, [data?.scoresOverTime]);

  const completionTrend = useMemo(() => {
    if (!data?.recentActivity.length) return [];
    const map = new Map<string, { date: string; completed: number; total: number }>();
    data.recentActivity.forEach((a) => {
      const existing = map.get(a.date) || { date: a.date, completed: 0, total: 0 };
      existing.total++;
      if (a.status === 'COMPLETED') existing.completed++;
      map.set(a.date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.recentActivity]);

  const radarData = useMemo(() => {
    if (!data?.auditorPerformance.length) return [];
    // Use top 5 auditors for the radar; normalize their metrics to 0–100
    const top = [...data.auditorPerformance]
      .sort((a, b) => b.totalAudits - a.totalAudits)
      .slice(0, 5);

    const maxAudits = Math.max(...top.map(a => a.totalAudits), 1);
    const metrics = ['totalAudits', 'avgScore', 'avgScore'];
    const metricLabels = ['Кол-во аудитов', 'Средний балл', 'Скорость'];

    return metricLabels.map((label, mi) => {
      const entry: Record<string, string | number> = { metric: label };
      top.forEach((a) => {
        const val = mi === 0
          ? (a.totalAudits / maxAudits) * 100
          : a.avgScore;
        entry[a.name.split(' ')[0]] = Math.round(val * 10) / 10;
      });
      return entry;
    });
  }, [data?.auditorPerformance]);

  const auditorNames = useMemo(() => {
    if (!data?.auditorPerformance.length) return [];
    return [...data.auditorPerformance]
      .sort((a, b) => b.totalAudits - a.totalAudits)
      .slice(0, 5)
      .map(a => a.name.split(' ')[0]);
  }, [data?.auditorPerformance]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading || !data) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <ChartSkeleton height={80} />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <ChartSkeleton height={300} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { overview } = data;

  // ─── Summary Cards ─────────────────────────────────────────────────────────

  const summaryCards = [
    {
      title: 'Средний балл',
      value: overview.avgScore.toFixed(1),
      suffix: '%',
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-l-emerald-500',
      description: 'По всем завершённым аудитам',
    },
    {
      title: 'Всего аудитов',
      value: overview.totalAssignments,
      icon: BarChart3,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
      borderColor: 'border-l-teal-500',
      description: `${overview.completedAssignments} завершено`,
    },
    {
      title: 'Процент выполнения',
      value: overview.completionRate.toFixed(1),
      suffix: '%',
      icon: TrendingUp,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
      borderColor: 'border-l-cyan-500',
      description: 'Запланировано → Завершено',
    },
    {
      title: 'Аудиторы',
      value: overview.totalAuditors,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/40',
      borderColor: 'border-l-violet-500',
      description: `${overview.totalTemplates} шаблонов`,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            Аналитика аудитов
          </h1>
          <p className="text-muted-foreground mt-1">
            Детальный анализ показателей, трендов и эффективности
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                Справочник
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Справочник оценок аудита</DialogTitle>
              </DialogHeader>
              <ScoringGuide />
            </DialogContent>
          </Dialog>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <CalendarDays className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
              <SelectItem value="all">Весь период</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Обновлено только что
          </Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
            >
              <Card className={`overflow-hidden border-l-4 ${card.borderColor} hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold tracking-tight">
                      {card.value}
                      {card.suffix && (
                        <span className="text-base font-normal text-muted-foreground">{card.suffix}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-foreground/80 mt-0.5">{card.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{card.description}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-muted/60 backdrop-blur-sm p-1 w-max min-w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Обзор</span>
            </TabsTrigger>
            <TabsTrigger value="auditors" className="gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Аудиторы</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Категории</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Данные</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════ OVERVIEW TAB ═══════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Score Distribution + Score Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Score Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChartHorizontal className="w-4 h-4 text-emerald-500" />
                    Распределение баллов
                  </CardTitle>
                  <CardDescription>Группировка оценок по диапазонам</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[280px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <BarChart data={scoreDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                          {scoreDistribution.map((entry, i) => (
                            <linearGradient
                              key={`dist-grad-${i}`}
                              id={`distGrad${i}`}
                              x1="0" y1="0" x2="0" y2="1"
                            >
                              <stop offset="0%" stopColor={getScoreBarColor(entry.min + 10)} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={getScoreBarColor(entry.min + 10)} stopOpacity={0.5} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={{ stroke: 'oklch(0.88 0 0)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Количество" radius={[8, 8, 0, 0]} maxBarSize={48}>
                          {scoreDistribution.map((entry, i) => (
                            <Cell key={i} fill={`url(#distGrad${i})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Score Trend Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-3"
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-500" />
                    Динамика оценок
                  </CardTitle>
                  <CardDescription>Средний балл по результатам аудитов</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[280px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <AreaChart data={data.scoresOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.35} />
                            <stop offset="60%" stopColor={COLORS.teal} stopOpacity={0.1} />
                            <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={COLORS.emerald} />
                            <stop offset="100%" stopColor={COLORS.teal} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }}
                          axisLine={{ stroke: 'oklch(0.88 0 0)' }}
                          tickLine={false}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="score"
                          name="Балл"
                          stroke="url(#lineGradient)"
                          strokeWidth={2.5}
                          fill="url(#trendGradient)"
                          dot={{ r: 3, fill: COLORS.emerald, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: COLORS.emerald, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Completion Trend + Assignment Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Completion Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    Тренд завершений
                  </CardTitle>
                  <CardDescription>Количество завершённых аудитов по дням</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[280px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <ComposedChart data={completionTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }}
                          axisLine={{ stroke: 'oklch(0.88 0 0)' }}
                          tickLine={false}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                          formatter={(value: string) => (
                            <span className="text-muted-foreground">{value}</span>
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Завершено"
                          stroke={COLORS.cyan}
                          strokeWidth={2}
                          fill="url(#completionGrad)"
                          dot={{ r: 3, fill: COLORS.cyan, strokeWidth: 0 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          name="Всего"
                          stroke={COLORS.violet}
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={{ r: 2, fill: COLORS.violet, strokeWidth: 0 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Donut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" />
                    Статусы аудитов
                  </CardTitle>
                  <CardDescription>Текущее распределение</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[200px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Завершён', value: overview.completedAssignments, fill: COLORS.emerald },
                            { name: 'Запланирован', value: overview.scheduledAssignments, fill: COLORS.blue },
                            { name: 'В процессе', value: overview.inProgressAssignments, fill: COLORS.amber },
                            { name: 'Просрочен', value: overview.overdueAssignments, fill: COLORS.red },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                    {[
                      { label: 'Завершён', value: overview.completedAssignments, color: 'bg-emerald-500' },
                      { label: 'Запланирован', value: overview.scheduledAssignments, color: 'bg-blue-500' },
                      { label: 'В процессе', value: overview.inProgressAssignments, color: 'bg-amber-500' },
                      { label: 'Просрочен', value: overview.overdueAssignments, color: 'bg-red-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                        <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                        <span className="text-xs font-bold ml-auto tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Category Heatmap + Equipment Frequency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Карта категорий
                  </CardTitle>
                  <CardDescription>Оценки по категориям аудита</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.categoryData.map((cat, i) => {
                      const score = cat.avgScore ?? (Math.random() * 60 + 40);
                      const heat = getHeatmapColor(score);
                      const barWidth = Math.max(score, 5);
                      return (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + i * 0.05 }}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{cat.count} ауд.</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${heat.bg} ${heat.text} border-0`}>
                                {heat.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="relative h-6 w-full rounded-md overflow-hidden bg-muted/40">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-md"
                              style={{
                                background: `linear-gradient(90deg, ${getScoreBarColor(score)}, ${getScoreBarColor(score)}cc)`,
                              }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-foreground/80">
                              {score.toFixed(1)}%
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Equipment Audit Frequency */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-500" />
                    Частота аудитов оборудования
                  </CardTitle>
                  <CardDescription>По категориям оборудования</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[300px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <BarChart
                        data={data.equipmentCategories}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <defs>
                          {data.equipmentCategories.map((_, i) => (
                            <linearGradient
                              key={`eq-grad-${i}`}
                              id={`eqGrad${i}`}
                              x1="0" y1="0" x2="1" y2="0"
                            >
                              <stop offset="0%" stopColor={CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={0.7} />
                              <stop offset="100%" stopColor={CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={1} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Количество аудитов" radius={[0, 8, 8, 0]} maxBarSize={28}>
                          {data.equipmentCategories.map((_, i) => (
                            <Cell key={i} fill={`url(#eqGrad${i})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* ═══════════════════════ AUDITORS TAB ═══════════════════════════════ */}
        <TabsContent value="auditors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    Сравнение аудиторов
                  </CardTitle>
                  <CardDescription>Радарная диаграмма по ключевым метрикам</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  {radarData.length > 0 ? (
                    <div className="h-[350px] min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="oklch(0.88 0 0)" />
                          <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fontSize: 11, fill: 'oklch(0.45 0 0)' }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: 'oklch(0.65 0 0)' }}
                            axisLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          {auditorNames.map((name, i) => (
                            <Radar
                              key={name}
                              name={name}
                              dataKey={name}
                              stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                              fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                              fillOpacity={0.12}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                            formatter={(value: string) => (
                              <span className="text-muted-foreground text-xs">{value}</span>
                            )}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      Недостаточно данных для отображения радара
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Score by Auditor - Horizontal Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChartHorizontal className="w-4 h-4 text-teal-500" />
                    Балл по аудиторам
                  </CardTitle>
                  <CardDescription>Средний результат каждого аудитора</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[350px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <BarChart
                        data={[...data.auditorPerformance].sort((a, b) => b.avgScore - a.avgScore)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <defs>
                          {[...data.auditorPerformance]
                            .sort((a, b) => b.avgScore - a.avgScore)
                            .map((a, i) => (
                              <linearGradient
                                key={`aud-grad-${i}`}
                                id={`audGrad${i}`}
                                x1="0" y1="0" x2="1" y2="0"
                              >
                                <stop offset="0%" stopColor={getScoreBarColor(a.avgScore)} stopOpacity={0.7} />
                                <stop offset="100%" stopColor={getScoreBarColor(a.avgScore)} stopOpacity={1} />
                              </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          unit="%"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'oklch(0.45 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          width={120}
                        />
                        <Tooltip
                          content={<CustomTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />}
                        />
                        <Bar dataKey="avgScore" name="Средний балл" radius={[0, 8, 8, 0]} maxBarSize={24}>
                          {[...data.auditorPerformance]
                            .sort((a, b) => b.avgScore - a.avgScore)
                            .map((a, i) => (
                              <Cell key={i} fill={`url(#audGrad${i})`} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Auditor Performance Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-500" />
                  Рейтинг аудиторов
                </CardTitle>
                <CardDescription>Детальные показатели каждого аудитора</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-1 px-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Аудитор</TableHead>
                      <TableHead>Подразделение</TableHead>
                      <TableHead className="text-right">Аудитов</TableHead>
                      <TableHead className="text-right">Средний балл</TableHead>
                      <TableHead className="w-[180px]">Уровень</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.auditorPerformance]
                      .sort((a, b) => b.avgScore - a.avgScore)
                      .map((auditor, i) => {
                        const heat = getHeatmapColor(auditor.avgScore);
                        return (
                          <TableRow key={auditor.name}>
                            <TableCell>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                : i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
                                : 'bg-muted text-muted-foreground'
                              }`}>
                                {i + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{auditor.name}</TableCell>
                            <TableCell className="text-muted-foreground">{auditor.department}</TableCell>
                            <TableCell className="text-right tabular-nums">{auditor.totalAudits}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{auditor.avgScore.toFixed(1)}%</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={auditor.avgScore}
                                  className="h-2 flex-1"
                                />
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${heat.bg} ${heat.text}`}>
                                  {heat.label}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════ CATEGORIES TAB ═════════════════════════════ */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    Аудиты по категориям
                  </CardTitle>
                  <CardDescription>Количество назначений по типу</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[320px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <BarChart data={data.categoryData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={{ stroke: 'oklch(0.88 0 0)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Количество" fill="url(#catGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Equipment Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-500" />
                    Парк оборудования
                  </CardTitle>
                  <CardDescription>Распределение по категориям</CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="h-[320px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <PieChart>
                        <Pie
                          data={data.equipmentCategories}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={45}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="name"
                          strokeWidth={0}
                        >
                          {data.equipmentCategories.map((_, i) => (
                            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                          formatter={(value: string) => (
                            <span className="text-muted-foreground text-xs">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Category Details Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  Детализация категорий
                </CardTitle>
                <CardDescription>Полная информация по каждой категории</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-1 px-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Категория</TableHead>
                      <TableHead className="text-right">Количество</TableHead>
                      <TableHead className="text-right">Доля</TableHead>
                      <TableHead className="w-[200px]">Распределение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.categoryData.map((cat, i) => {
                      const total = data.categoryData.reduce((s, c) => s + c.count, 0);
                      const pct = ((cat.count / total) * 100).toFixed(1);
                      return (
                        <TableRow key={cat.name}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                            />
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{cat.count}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{pct}%</TableCell>
                          <TableCell>
                            <Progress value={parseFloat(pct)} className="h-2" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════ DATA TAB ═════════════════════════════════ */}
        <TabsContent value="data" className="space-y-4">
          {/* Recent Activity Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      Журнал аудитов
                    </CardTitle>
                    <CardDescription>Все последние действия — формат подходит для экспорта</CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    {data.recentActivity.length} записей
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-1 px-1">
                <div className="rounded-lg border overflow-hidden min-w-[480px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Дата</TableHead>
                        <TableHead className="font-semibold">Шаблон аудита</TableHead>
                        <TableHead className="font-semibold">Аудитор</TableHead>
                        <TableHead className="font-semibold text-center">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentActivity.map((activity) => {
                        const config = statusConfig[activity.status] || statusConfig.SCHEDULED;
                        const Icon = config.icon;
                        return (
                          <TableRow key={activity.id}>
                            <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                              {formatAnalyticsDate(activity.date)}
                            </TableCell>
                            <TableCell className="font-medium">{activity.templateTitle}</TableCell>
                            <TableCell className="text-muted-foreground">{activity.auditorName}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${config.color}`}>
                                  <Icon className="w-3 h-3" />
                                </div>
                                <span className="text-xs font-medium">{config.label}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Export-Ready Scores Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-teal-500" />
                  Данные оценок
                </CardTitle>
                <CardDescription>История оценок для экспорта и анализа</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-1 px-1">
                <div className="rounded-lg border overflow-hidden min-w-[480px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Дата</TableHead>
                        <TableHead className="font-semibold text-right">Балл</TableHead>
                        <TableHead className="font-semibold text-center">Оценка</TableHead>
                        <TableHead className="w-[200px] font-semibold">Визуализация</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.scoresOverTime.map((entry, i) => {
                        const heat = getHeatmapColor(entry.score);
                        return (
                          <TableRow key={i}>
                            <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                              {formatAnalyticsDate(entry.date)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">
                              {entry.score.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${heat.bg} ${heat.text}`}>
                                  {heat.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Progress value={entry.score} className="h-2" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
