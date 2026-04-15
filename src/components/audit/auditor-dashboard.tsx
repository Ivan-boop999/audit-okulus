'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckCircle2, Clock, TrendingUp, Bell, Award, BarChart3, Target,
  ArrowRight, Play, User, ClipboardList, Zap, Timer,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button,
  Progress, Avatar, AvatarFallback, Separator,
} from '@/components/ui/card';
import {
  format, parseISO, isAfter, isToday, isBefore, startOfDay,
  differenceInDays, differenceInHours, startOfWeek, endOfWeek, isSameDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  notes: string | null;
  template: { id: string; title: string; category: string; status: string };
  auditor: { id: string; name: string; email: string; department: string | null };
  responses: {
    id: string;
    score: number | null;
    maxScore: number | null;
    status: string;
    completedAt: string | null;
    answers: { id: string; answer: string | null; comment: string | null; photoUrl: string | null }[];
  }[];
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface AuditorDashboardProps {
  userId: string;
  onStartAudit?: (assignmentId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Запланирован', color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
  IN_PROGRESS: { label: 'В процессе', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  COMPLETED: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  OVERDUE: { label: 'Просрочен', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  CANCELLED: { label: 'Отменён', color: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700' },
};

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 85) return 'bg-emerald-100 dark:bg-emerald-950';
  if (score >= 70) return 'bg-amber-100 dark:bg-amber-950';
  return 'bg-red-100 dark:bg-red-950';
}

function getScoreBadgeColor(score: number): string {
  if (score >= 85) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (score >= 70) return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  return 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300';
}

function formatRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const hours = differenceInHours(now, date);
  const days = differenceInDays(now, date);

  if (hours < 1) return 'только что';
  if (hours < 24) return `${hours} ч. назад`;
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 нед. назад' : `${weeks} нед. назад`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 мес. назад' : `${months} мес. назад`;
  }
  return format(date, 'dd MMM yyyy', { locale: ru });
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display}</>;
}

// ─── Circular Progress Ring ─────────────────────────────────────────────────

function CircularProgressRing({
  percentage, size = 140, strokeWidth = 10, children,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          className="stroke-muted/50"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={center} cy={center} r={radius}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
        />
        {/* Glow effect */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          className="stroke-emerald-400/30"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: 'blur(4px)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Container variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AuditorDashboard({ userId, onStartAudit }: AuditorDashboardProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for greeting accuracy
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignRes, notifRes] = await Promise.all([
          fetch(`/api/assignments?userId=${userId}`),
          fetch(`/api/notifications?userId=${userId}`),
        ]);
        if (assignRes.ok) setAssignments(await assignRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // ─── Computed values ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    const upcoming = assignments.filter(
      (a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS'
    );
    const completed = assignments.filter((a) => a.status === 'COMPLETED');
    const completedWithResponses = completed.filter((a) => a.responses.length > 0);

    const allCompletedResponses = completed.flatMap((a) => a.responses).filter((r) => r.status === 'COMPLETED' && r.score != null);
    const avgScore = allCompletedResponses.length > 0
      ? allCompletedResponses.reduce((sum, r) => sum + (r.score ?? 0), 0) / allCompletedResponses.length
      : 0;

    const unreadNotifications = notifications.filter((n) => !n.isRead).length;
    const totalQuestions = assignments.reduce(
      (sum, a) => sum + a.responses.reduce((rSum, r) => rSum + r.answers.length, 0), 0
    );

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeekAudits = assignments.filter((a) => {
      const date = parseISO(a.scheduledDate);
      return isAfter(date, weekStart) && isBefore(date, weekEnd);
    }).length;

    const completionRate = assignments.length > 0
      ? Math.round((completed.length / assignments.length) * 100)
      : 0;

    return {
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      avgScore: Math.round(avgScore * 10) / 10,
      unreadNotifications,
      totalQuestions,
      thisWeekAudits,
      completionRate,
      totalAssignments: assignments.length,
    };
  }, [assignments, notifications]);

  const upcomingAudits = useMemo(() => {
    return assignments
      .filter((a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5);
  }, [assignments]);

  const recentActivity = useMemo(() => {
    return assignments
      .filter((a) => a.status === 'COMPLETED' && a.responses.length > 0)
      .sort((a, b) => {
        const dateA = a.responses[0]?.completedAt ? new Date(a.responses[0].completedAt).getTime() : 0;
        const dateB = b.responses[0]?.completedAt ? new Date(b.responses[0].completedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [assignments]);

  // ─── Greeting logic ───────────────────────────────────────────────────

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const auditorName = assignments[0]?.auditor?.name || 'Аудитор';
  const department = assignments[0]?.auditor?.department;

  // ─── Loading skeleton ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="shimmer h-3 w-32 rounded" />
            <div className="shimmer h-7 w-56 rounded" />
            <div className="shimmer h-4 w-40 rounded mt-1" />
          </div>
          <div className="shimmer h-10 w-10 rounded-full" />
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="shimmer h-4 w-24 rounded mb-3" />
                <div className="shimmer h-9 w-16 rounded mb-2" />
                <div className="shimmer h-3 w-20 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="shimmer h-4 w-32 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="shimmer h-12 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── KPI Cards Data ───────────────────────────────────────────────────

  const kpiCards = [
    {
      title: 'Предстоящие аудиты',
      value: stats.upcomingCount,
      icon: ClipboardList,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/60',
      borderColor: 'border-sky-200/60 dark:border-sky-800/40',
      description: 'запланировано и в работе',
    },
    {
      title: 'Завершено',
      value: stats.completedCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
      description: 'аудитов выполнено',
    },
    {
      title: 'Средний балл',
      value: stats.avgScore,
      suffix: '%',
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      borderColor: 'border-amber-200/60 dark:border-amber-800/40',
      description: 'средняя оценка',
    },
    {
      title: 'Уведомления',
      value: stats.unreadNotifications,
      icon: Bell,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/60',
      borderColor: 'border-rose-200/60 dark:border-rose-800/40',
      description: 'непрочитанных',
      pulse: stats.unreadNotifications > 0,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6 p-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">
            {getGreeting()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
            {auditorName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="font-normal border-primary/30 text-primary bg-primary/5">
              <User className="w-3 h-3 mr-1" />
              Аудитор
            </Badge>
            {department && (
              <Badge variant="outline" className="font-normal border-muted-foreground/20 text-muted-foreground">
                {department}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              <Separator orientation="vertical" className="inline-block h-3.5 w-px mx-2 align-middle" />
              {format(currentTime, 'EEEE, d MMMM yyyy', { locale: ru })}
            </span>
          </div>
        </div>

        {/* Time / Quick action */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {format(currentTime, 'HH:mm')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(currentTime, 'd MMMM', { locale: ru })}
            </div>
          </div>
          <Avatar className="h-11 w-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {auditorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.div>

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.title} variants={itemVariants}>
              <Card className={`overflow-hidden card-hover-lift border ${kpi.borderColor} group relative`}>
                {/* Decorative gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  i === 0 ? 'from-sky-400 to-cyan-400' :
                  i === 1 ? 'from-emerald-400 to-teal-400' :
                  i === 2 ? 'from-amber-400 to-orange-400' :
                  'from-rose-400 to-pink-400'
                }`} />

                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bgColor} transition-transform group-hover:scale-110`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    {kpi.pulse && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">
                        {typeof kpi.value === 'number' ? (
                          <AnimatedCounter value={kpi.value} />
                        ) : kpi.value}
                      </span>
                      {kpi.suffix && (
                        <span className="text-lg font-normal text-muted-foreground">{kpi.suffix}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground/80 mt-0.5">{kpi.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════ MIDDLE ROW: Progress + Upcoming Audits ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Progress Overview ─── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full overflow-hidden card-hover-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Общий прогресс
              </CardTitle>
              <CardDescription>Статус выполнения аудитов</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2 pb-6">
              <CircularProgressRing percentage={stats.completionRate} size={150} strokeWidth={11}>
                <div className="text-center">
                  <span className="text-3xl font-bold text-gradient">
                    {stats.completionRate}
                  </span>
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
              </CircularProgressRing>

              <p className="text-sm text-muted-foreground mt-4 text-center">
                <span className="font-semibold text-foreground">{stats.completedCount}</span>
                {' из '}
                <span className="font-semibold text-foreground">{stats.totalAssignments}</span>
                {' аудитов завершено'}
              </p>

              {/* Mini progress bar */}
              <div className="w-full mt-4 px-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Прогресс</span>
                  <span className="font-medium">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-2 [&>div]:progress-gradient" />
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-5 w-full px-1">
                <div className="text-center p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {assignments.filter((a) => a.status === 'COMPLETED').length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Готово</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {assignments.filter((a) => a.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">В работе</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-sky-50/80 dark:bg-sky-950/30">
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
                    {assignments.filter((a) => a.status === 'SCHEDULED').length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Ожидание</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Upcoming Audits ─── */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Ближайшие аудиты
                  </CardTitle>
                  <CardDescription>Следующие запланированные проверки</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {upcomingAudits.length} активных
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              {upcomingAudits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <ClipboardList className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Нет запланированных аудитов</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Новые назначения появятся здесь</p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto px-4">
                  <div className="space-y-1">
                    {upcomingAudits.map((assignment, index) => {
                      const scheduledDate = parseISO(assignment.scheduledDate);
                      const dueDate = assignment.dueDate ? parseISO(assignment.dueDate) : null;
                      const isOverdue = dueDate && isBefore(dueDate, new Date()) && assignment.status !== 'COMPLETED';
                      const isTodayAudit = isToday(scheduledDate);
                      const config = statusConfig[assignment.status] || statusConfig.SCHEDULED;

                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.06, duration: 0.3 }}
                        >
                          <div className={`
                            group flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                            hover:bg-muted/40 ${isTodayAudit ? 'ring-1 ring-primary/20 bg-primary/5' : ''}
                          `}>
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div className={`
                                w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                                ${isOverdue ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' :
                                  isTodayAudit ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' :
                                  'bg-muted text-muted-foreground'}
                                ${isTodayAudit ? 'status-online' : ''}
                              `}>
                                {isTodayAudit ? (
                                  <Zap className="w-4 h-4" />
                                ) : (
                                  <span>{format(scheduledDate, 'd')}</span>
                                )}
                              </div>
                              {index < upcomingAudits.length - 1 && (
                                <div className="w-px h-6 bg-border/50" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-medium truncate">{assignment.template.title}</p>
                                {isTodayAudit && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                                    Сегодня
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(scheduledDate, 'd MMM yyyy, HH:mm', { locale: ru })}
                                </span>
                                {dueDate && (
                                  <>
                                    <span className="text-border">•</span>
                                    <Timer className="w-3 h-3" />
                                    <span>до {format(dueDate, 'd MMM', { locale: ru })}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status badge + Action */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${config.color}`}>
                                {config.label}
                              </Badge>
                              {assignment.status === 'SCHEDULED' && onStartAudit && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 transition-all"
                                  onClick={() => onStartAudit(assignment.id)}
                                >
                                  <Play className="w-3 h-3" />
                                  Начать
                                </Button>
                              )}
                              {assignment.status === 'IN_PROGRESS' && onStartAudit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                                  onClick={() => onStartAudit(assignment.id)}
                                >
                                  Продолжить
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════ BOTTOM ROW: Recent Activity + Quick Stats ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Recent Activity ─── */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Последние результаты
                  </CardTitle>
                  <CardDescription>Завершённые аудиты и их оценки</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {recentActivity.length} записей
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <BarChart3 className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Пока нет завершённых аудитов</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Результаты появятся после проведения проверок</p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto px-4">
                  <div className="space-y-2">
                    {recentActivity.map((assignment, index) => {
                      const response = assignment.responses[0];
                      const score = response?.score != null
                        ? Math.round((response.score / (response.maxScore || 100)) * 100)
                        : null;
                      const completedAt = response?.completedAt;

                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.06, duration: 0.3 }}
                        >
                          <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                            {/* Score indicator */}
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${getScoreBgColor(score ?? 0)} transition-transform group-hover:scale-105`}>
                              {score != null ? (
                                <>
                                  <span className={`text-lg font-bold leading-none ${getScoreColor(score)}`}>
                                    {score}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                    баллов
                                  </span>
                                </>
                              ) : (
                                <Award className="w-5 h-5 text-muted-foreground/50" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {assignment.template.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {assignment.template.category}
                                </span>
                                {completedAt && (
                                  <>
                                    <span className="text-border text-xs">•</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatRelativeTime(completedAt)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Score badge */}
                            {score != null && (
                              <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 flex-shrink-0 ${getScoreBadgeColor(score)}`}>
                                {score >= 85 ? 'Отлично' : score >= 70 ? 'Хорошо' : 'Требует внимания'}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Quick Stats ─── */}
        <motion.div variants={itemVariants}>
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Быстрая статистика
              </CardTitle>
              <CardDescription>Ключевые показатели активности</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Questions */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">Ответов на вопросы</div>
                  <div className="text-lg font-bold">{stats.totalQuestions}</div>
                </div>
              </div>

              {/* This Week */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">Аудиты на этой неделе</div>
                  <div className="text-lg font-bold">{stats.thisWeekAudits}</div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">Процент выполнения</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{stats.completionRate}%</span>
                    <Progress value={stats.completionRate} className="h-1.5 flex-1 max-w-[80px] [&>div]:progress-gradient" />
                  </div>
                </div>
              </div>

              {/* Average Score */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">Средний результат</div>
                  <div className="text-lg font-bold">
                    {stats.avgScore}%
                    {stats.avgScore >= 85 && <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Отлично</span>}
                    {stats.avgScore >= 70 && stats.avgScore < 85 && <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">Хорошо</span>}
                    {stats.avgScore > 0 && stats.avgScore < 70 && <span className="ml-1.5 text-xs text-red-600 dark:text-red-400 font-medium">Нужно улучшить</span>}
                  </div>
                </div>
              </div>

              {/* Notifications Link */}
              <Separator className="my-2" />

              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group">
                <Bell className={`w-4 h-4 ${stats.unreadNotifications > 0 ? 'text-rose-500' : 'text-muted-foreground'} group-hover:text-primary transition-colors`} />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {stats.unreadNotifications > 0
                    ? `${stats.unreadNotifications} непрочитанных уведомлений`
                    : 'Все уведомления прочитаны'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════ FOOTER MOTIVATIONAL CARD ═══════════════ */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-2xl p-4 border border-border/50">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {stats.upcomingCount > 0
                  ? `У вас ${stats.upcomingCount} ${stats.upcomingCount === 1 ? 'активный аудит' : stats.upcomingCount < 5 ? 'активных аудита' : 'активных аудитов'}`
                  : 'Все аудиты завершены'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.upcomingCount > 0
                  ? 'Не забудьте выполнить проверки вовремя и заполнить все необходимые данные'
                  : stats.completedCount > 0
                    ? 'Отличная работа! Вы завершили все назначенные проверки'
                    : 'Начните свою первую проверку, чтобы отслеживать прогресс'}
              </p>
            </div>
            {upcomingAudits.length > 0 && onStartAudit && (
              <Button
                size="sm"
                onClick={() => onStartAudit(upcomingAudits[0].id)}
                className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Начать аудит
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
