'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import {
  CheckCircle2, Clock, AlertTriangle, Wrench, FileText, Users,
  TrendingUp, Activity, Target, CalendarDays, ArrowUpRight, ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Sparkline Helper ──────────────────────────────────────────────────────

function generateSparklineData(value: number, type: 'score' | 'count' | 'attention'): number[] {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    let base: number;
    if (type === 'score') {
      base = value - 10 + Math.random() * 15;
      base = Math.max(60, Math.min(100, base));
    } else if (type === 'attention') {
      base = value - 3 + Math.random() * 8;
      base = Math.max(0, Math.round(base));
    } else {
      base = value - Math.floor(value * 0.15) + Math.random() * value * 0.25;
      base = Math.max(0, Math.round(base));
    }
    points.push(base);
  }
  points.push(value);
  return points;
}

function KPISparkline({ data, color, sparkId }: { data: number[]; color: string; sparkId: string }) {
  const chartData = data.map((v) => ({ v }));
  return (
    <motion.div
      className="h-10 w-full -mx-1 mt-1"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`sparkGrad-${sparkId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={0}
            fill={`url(#sparkGrad-${sparkId})`}
            dot={false}
            activeDot={false}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mt-2">
      <div className="h-1 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

interface Analytics {
  overview: {
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
  };
  scoresOverTime: { date: string; score: number }[];
  categoryData: { name: string; count: number }[];
  auditorPerformance: { name: string; department: string; totalAudits: number; avgScore: number }[];
  equipmentCategories: { name: string; count: number }[];
  recentActivity: { id: string; templateTitle: string; auditorName: string; status: string; date: string }[];
}

const COLORS = ['#059669', '#d97706', '#0ea5e9', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f59e0b'];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  COMPLETED: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle2 },
  SCHEDULED: { label: 'Запланирован', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800', icon: CalendarDays },
  IN_PROGRESS: { label: 'В процессе', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800', icon: Clock },
  OVERDUE: { label: 'Просрочен', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800', icon: AlertTriangle },
};

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="shimmer h-4 w-24 rounded mb-3" />
              <div className="shimmer h-8 w-16 rounded mb-2" />
              <div className="shimmer h-3 w-32 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { overview } = data;

  const kpiCards = [
    {
      title: 'Средний балл',
      value: overview.avgScore,
      suffix: '%',
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400',
      sparkColor: '#059669',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      trend: '+2.3%',
      trendUp: true,
      sparkType: 'score' as const,
    },
    {
      title: 'Завершено аудитов',
      value: overview.completedAssignments,
      icon: CheckCircle2,
      color: 'text-blue-600 dark:text-blue-400',
      sparkColor: '#2563eb',
      bgColor: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20',
      borderColor: 'border-blue-100 dark:border-blue-900/50',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      trend: '+12%',
      trendUp: true,
      sparkType: 'count' as const,
    },
    {
      title: 'Требует внимания',
      value: overview.overdueAssignments + overview.inProgressAssignments,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      sparkColor: '#d97706',
      bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20',
      borderColor: 'border-amber-100 dark:border-amber-900/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      trend: '-5%',
      trendUp: false,
      sparkType: 'attention' as const,
    },
    {
      title: 'Всего назначений',
      value: overview.totalAssignments,
      icon: CalendarDays,
      color: 'text-violet-600 dark:text-violet-400',
      sparkColor: '#7c3aed',
      bgColor: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20',
      borderColor: 'border-violet-100 dark:border-violet-900/50',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      trend: '+8%',
      trendUp: true,
      sparkType: 'count' as const,
    },
    {
      title: 'Оборудование',
      value: overview.totalEquipment,
      icon: Wrench,
      color: 'text-teal-600 dark:text-teal-400',
      sparkColor: '#0d9488',
      bgColor: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20',
      borderColor: 'border-teal-100 dark:border-teal-900/50',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      progressBar: { max: 10 } as const,
    },
    {
      title: 'Шаблоны аудитов',
      value: overview.totalTemplates,
      icon: FileText,
      color: 'text-rose-600 dark:text-rose-400',
      sparkColor: '#e11d48',
      bgColor: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20',
      borderColor: 'border-rose-100 dark:border-rose-900/50',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      progressBar: { max: 5 } as const,
    },
    {
      title: 'Аудиторы',
      value: overview.totalAuditors,
      icon: Users,
      color: 'text-pink-600 dark:text-pink-400',
      sparkColor: '#ec4899',
      bgColor: 'bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-950/30 dark:to-fuchsia-950/20',
      borderColor: 'border-pink-100 dark:border-pink-900/50',
      iconBg: 'bg-pink-100 dark:bg-pink-900/50',
      progressBar: { max: 5 } as const,
    },
    {
      title: 'Процент выполнения',
      value: overview.completionRate,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      sparkColor: '#059669',
      bgColor: 'bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/30 dark:to-green-950/20',
      borderColor: 'border-lime-100 dark:border-lime-900/50',
      iconBg: 'bg-lime-100 dark:bg-lime-900/50',
      trend: '+3.1%',
      trendUp: true,
      progressBar: { max: 100 } as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/10 p-6 shadow-[0_0_20px_-3px_oklch(0.37_0.13_160/0.15)] dark:shadow-[0_0_25px_-3px_oklch(0.55_0.15_160/0.1)]"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-2xl dark:opacity-50" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Панель управления</h1>
            <p className="text-muted-foreground mt-0.5">Обзор состояния аудитов и ключевые показатели</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
            <div className="text-right">
              <div className="font-semibold text-foreground">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="text-xs">{overview.scheduledAssignments} аудит(ов) запланировано</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Overview Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Сегодня запланировано', value: overview.scheduledAssignments, icon: CalendarDays, color: 'from-sky-500/10 to-blue-500/10 dark:from-sky-500/5 dark:to-blue-500/5', iconColor: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200/60 dark:border-sky-800/40' },
          { label: 'В процессе', value: overview.inProgressAssignments, icon: Activity, color: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5', iconColor: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/60 dark:border-amber-800/40' },
          { label: 'Просрочено', value: overview.overdueAssignments, icon: AlertTriangle, color: 'from-red-500/10 to-rose-500/10 dark:from-red-500/5 dark:to-rose-500/5', iconColor: 'text-red-600 dark:text-red-400', border: 'border-red-200/60 dark:border-red-800/40' },
          { label: 'Завершено сегодня', value: overview.completedAssignments, icon: CheckCircle2, color: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5', iconColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/40' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 bg-gradient-to-br ${item.color} ${item.border} transition-all duration-200 hover:shadow-sm`}>
              <Icon className={`w-4.5 h-4.5 ${item.iconColor} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{item.label}</div>
                <div className={`text-lg font-bold leading-tight tabular-nums ${item.iconColor}`}>{item.value}</div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border card-shine ${kpi.borderColor}`}>
                <CardContent className={`p-5 ${kpi.bgColor} rounded-lg`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg} shadow-sm`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    {kpi.trend && (
                      <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        kpi.trendUp ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50' : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/50'
                      }`}>
                        {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.trend}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold tracking-tight">
                      {typeof kpi.value === 'number' && kpi.value > 100 ? kpi.value.toLocaleString() : kpi.value}
                      {kpi.suffix && <span className="text-base font-normal text-muted-foreground">{kpi.suffix}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{kpi.title}</div>
                    {'sparkType' in kpi && (
                      <KPISparkline
                        data={generateSparklineData(kpi.value as number, kpi.sparkType)}
                        color={kpi.sparkColor}
                        sparkId={kpi.title.replace(/\s+/g, '-')}
                      />
                    )}
                    {'progressBar' in kpi && kpi.progressBar && (
                      <MiniProgressBar
                        value={kpi.value as number}
                        max={kpi.progressBar.max}
                        color={kpi.sparkColor}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Динамика оценок</CardTitle>
              <CardDescription>Средний балл по проведённым аудитам за последние 30 дней</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.scoresOverTime}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="oklch(0.7 0 0)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="oklch(0.7 0 0)" />
                    <Tooltip
                      contentStyle={{
                        background: 'oklch(1 0 0)',
                        border: '1px solid oklch(0.92 0 0)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignment Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Статус аудитов</CardTitle>
              <CardDescription>Распределение по текущему статусу</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Завершён', value: overview.completedAssignments, fill: '#059669' },
                        { name: 'Запланирован', value: overview.scheduledAssignments, fill: '#3b82f6' },
                        { name: 'В процессе', value: overview.inProgressAssignments, fill: '#f59e0b' },
                        { name: 'Просрочен', value: overview.overdueAssignments, fill: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { label: 'Завершён', value: overview.completedAssignments, color: 'bg-emerald-500' },
                  { label: 'Запланирован', value: overview.scheduledAssignments, color: 'bg-blue-500' },
                  { label: 'В процессе', value: overview.inProgressAssignments, color: 'bg-amber-500' },
                  { label: 'Просрочен', value: overview.overdueAssignments, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-bold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Аудиты по категориям</CardTitle>
              <CardDescription>Количество назначений по типу аудита</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.7 0 0)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.7 0 0)" />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Equipment Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Парк оборудования</CardTitle>
              <CardDescription>Распределение по категориям</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.equipmentCategories}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.equipmentCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Auditor Performance & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Auditor Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Эффективность аудиторов</CardTitle>
              <CardDescription>Рейтинг по среднему баллу и количеству аудитов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.auditorPerformance
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .map((auditor, i) => (
                  <div key={auditor.name} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {auditor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{auditor.name}</div>
                      <div className="text-xs text-muted-foreground">{auditor.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{auditor.avgScore.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">{auditor.totalAudits} аудитов</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Последняя активность</CardTitle>
              <CardDescription>Недавние действия по аудитам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentActivity.map((activity) => {
                  const config = statusConfig[activity.status] || statusConfig.SCHEDULED;
                  const Icon = config.icon;
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{activity.templateTitle}</div>
                        <div className="text-xs text-muted-foreground">{activity.auditorName}</div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
