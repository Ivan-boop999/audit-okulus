'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks, Search, CalendarDays, Clock, CheckCircle2,
  AlertTriangle, Play, ArrowUpDown, Filter, Layers, Sparkles,
  ChevronDown, ClipboardList, Eye, Zap, Target, CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  title: string;
  category: string;
  status: string;
  frequency?: string | null;
  questions?: { id: string }[];
}

interface Auditor {
  id: string;
  name: string;
  department?: string | null;
}

interface Response {
  id: string;
  status: string;
  score?: number | null;
}

interface Assignment {
  id: string;
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  template: Template;
  auditor: Auditor;
  responses?: Response[];
}

interface AuditorMyAuditsProps {
  user: { id: string; name: string; email: string; role: string };
  onStartAudit?: (assignmentId: string) => void;
  onViewReport?: (responseId: string) => void;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, {
  label: string;
  color: string;
  icon: React.ElementType;
  dotColor: string;
  borderColor: string;
  gradientBg: string;
  countColor: string;
}> = {
  SCHEDULED: {
    label: 'Запланирован',
    color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    icon: CalendarClock,
    dotColor: 'bg-sky-500',
    borderColor: 'border-l-sky-400',
    gradientBg: 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/20',
    countColor: 'text-sky-600 dark:text-sky-400',
  },
  IN_PROGRESS: {
    label: 'В процессе',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Play,
    dotColor: 'bg-amber-500',
    borderColor: 'border-l-amber-400',
    gradientBg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20',
    countColor: 'text-amber-600 dark:text-amber-400',
  },
  COMPLETED: {
    label: 'Завершён',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    borderColor: 'border-l-emerald-400',
    gradientBg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
    countColor: 'text-emerald-600 dark:text-emerald-400',
  },
  OVERDUE: {
    label: 'Просрочен',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    icon: AlertTriangle,
    dotColor: 'bg-red-500',
    borderColor: 'border-l-red-400',
    gradientBg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
    countColor: 'text-red-600 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Отменён',
    color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
    icon: Clock,
    dotColor: 'bg-slate-400',
    borderColor: 'border-l-slate-300 dark:border-l-slate-600',
    gradientBg: 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
    countColor: 'text-slate-500 dark:text-slate-400',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyInfo(dateStr: string, status: string): { color: string; label: string; barColor: string } {
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return { color: 'text-slate-400', label: '', barColor: 'bg-slate-300' };
  }
  const days = getDaysUntil(dateStr);
  if (days < 0) return { color: 'text-red-600 dark:text-red-400 font-semibold', label: 'просрочено', barColor: 'bg-red-500' };
  if (days === 0) return { color: 'text-emerald-600 dark:text-emerald-400', label: 'сегодня', barColor: 'bg-emerald-500' };
  if (days <= 3) return { color: 'text-amber-600 dark:text-amber-400', label: `${days} дн.`, barColor: 'bg-amber-500' };
  return { color: 'text-sky-600 dark:text-sky-400', label: `${days} дн.`, barColor: 'bg-sky-400' };
}

function getCategoryBadgeStyle(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('безопасность') || cat.includes('safety')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
  if (cat.includes('качество') || cat.includes('quality')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  if (cat.includes('окружающая') || cat.includes('эколог') || cat.includes('environment')) return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  if (cat.includes('техническое') || cat.includes('техник') || cat.includes('maintenance')) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  if (cat.includes('санитар') || cat.includes('гигиен') || cat.includes('hygiene')) return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700';
}

function getScoreBadge(score: number): { label: string; color: string } {
  const rounded = Math.round(score * 10) / 10;
  if (score >= 80) return { label: `${rounded}%`, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' };
  if (score >= 60) return { label: `${rounded}%`, color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300' };
  return { label: `${rounded}%`, color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300' };
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditorMyAudits({ user, onStartAudit, onViewReport }: AuditorMyAuditsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'template'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [startingAudit, setStartingAudit] = useState<string | null>(null);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assignments?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Не удалось загрузить аудиты');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ─── Derived Data ────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: assignments.length,
    scheduled: assignments.filter((a) => a.status === 'SCHEDULED').length,
    inProgress: assignments.filter((a) => a.status === 'IN_PROGRESS').length,
    completed: assignments.filter((a) => a.status === 'COMPLETED').length,
    overdue: assignments.filter((a) => a.status === 'OVERDUE').length,
  }), [assignments]);

  const filteredAssignments = useMemo(() => {
    let items = [...assignments];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.template?.title?.toLowerCase().includes(q) ||
          a.template?.category?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q),
      );
    }

    if (filterStatus !== 'all') {
      items = items.filter((a) => a.status === filterStatus);
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'template') cmp = (a.template?.title || '').localeCompare(b.template?.title || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [assignments, searchQuery, filterStatus, sortBy, sortDir]);

  const hasFilters = searchQuery || filterStatus !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleStartAudit = async (assignment: Assignment) => {
    setStartingAudit(assignment.id);
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignment.id, status: 'IN_PROGRESS' }),
      });
      if (!res.ok) throw new Error('Status update failed');
      toast.success(`Аудит «${assignment.template?.title}» начат`);
      fetchAssignments();
      if (onStartAudit) onStartAudit(assignment.id);
    } catch {
      toast.error('Не удалось начать аудит');
    } finally {
      setStartingAudit(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Gradient Header Section ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-emerald-700 p-6 sm:p-8 text-white"
      >
        {/* Decorative blurred circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-teal-300/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Мои аудиты</h1>
            </div>
          </div>
          <p className="text-emerald-100/80 text-sm sm:text-base">
            Список всех назначенных вам проверок и аудитов
          </p>
        </div>
      </motion.div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {[
          { key: 'total', label: 'Всего аудитов', value: stats.total, icon: Layers, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20', iconBg: 'bg-slate-200 dark:bg-slate-700', borderColor: 'border-slate-100 dark:border-slate-900/50' },
          { key: 'scheduled', label: 'Запланировано', value: stats.scheduled, icon: CalendarClock, color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/20', iconBg: 'bg-sky-100 dark:bg-sky-900/50', borderColor: 'border-sky-100 dark:border-sky-900/50' },
          { key: 'completed', label: 'Завершено', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', borderColor: 'border-emerald-100 dark:border-emerald-900/50' },
          { key: 'overdue', label: 'Просрочено', value: stats.overdue, icon: AlertTriangle, color: 'text-red-700 dark:text-red-400', bgColor: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20', iconBg: 'bg-red-100 dark:bg-red-900/50', borderColor: 'border-red-100 dark:border-red-900/50' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
            >
              <Card className={`overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border ${card.borderColor}`}>
                <CardContent className={`p-4 ${card.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} shadow-sm`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <motion.div
                      className="text-2xl font-bold tabular-nums"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      {card.value}
                    </motion.div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ─── Search & Filters ──────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по шаблону или категории..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px] h-10">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="SCHEDULED">Запланирован</SelectItem>
                <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
                <SelectItem value="COMPLETED">Завершён</SelectItem>
                <SelectItem value="OVERDUE">Просрочен</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant={sortBy === 'date' ? 'default' : 'ghost'}
                size="sm"
                className="h-10 gap-1 text-xs"
                onClick={() => toggleSort('date')}
              >
                <ArrowUpDown className="w-3 h-3" />
                Дата
              </Button>
              <Button
                variant={sortBy === 'status' ? 'default' : 'ghost'}
                size="sm"
                className="h-10 gap-1 text-xs"
                onClick={() => toggleSort('status')}
              >
                <ArrowUpDown className="w-3 h-3" />
                Статус
              </Button>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-10 text-xs text-muted-foreground" onClick={clearFilters}>
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-4 w-3/4 rounded" />
                    <div className="shimmer h-3 w-1/2 rounded" />
                    <div className="shimmer h-3 w-2/3 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        /* ─── Empty State ─────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-dashed bg-gradient-to-b from-muted/40 to-muted/10 dark:from-muted/20 dark:to-muted/5"
        >
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 flex items-center justify-center shadow-lg">
                <ClipboardList className="w-10 h-10 text-teal-600 dark:text-teal-400" />
              </div>
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
                className="absolute -inset-2 rounded-3xl bg-teal-400/20 blur-md -z-10"
              />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Аудиты не найдены</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {hasActiveFilters
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'У вас пока нет назначенных аудитов. Новые назначения появятся здесь автоматически.'}
            </p>
          </div>
        </motion.div>
      ) : (
        /* ─── Audit List ──────────────────────────────────────────────── */
        <motion.div
          key="audit-list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredAssignments.map((item) => {
              const statusCfg = statusConfig[item.status] || statusConfig.SCHEDULED;
              const StatusIcon = statusCfg.icon;
              const urgency = getUrgencyInfo(item.scheduledDate, item.status);
              const isStartable = item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS';
              const isCompleted = item.status === 'COMPLETED';
              const response = item.responses?.find((r) => r.status === 'COMPLETED');
              const score = response?.score;

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                >
                  <Card
                    className={`group overflow-hidden transition-all duration-300 border-l-4 ${statusCfg.borderColor} hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Date Column */}
                        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:min-w-[72px]">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center border flex-shrink-0 ${statusCfg.gradientBg} transition-colors`}>
                            <span className="text-xs sm:text-sm font-bold leading-none text-foreground">
                              {new Date(item.scheduledDate).getDate()}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-none mt-0.5">
                              {new Date(item.scheduledDate).toLocaleDateString('ru-RU', { month: 'short' })}
                            </span>
                          </div>
                          <div className="flex flex-col items-center sm:hidden">
                            <span className={`w-1 h-8 rounded-r-full ${urgency.barColor}`} />
                          </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 min-w-0 relative pl-4 sm:pl-0 border-l-4 sm:border-l-0 border-transparent sm:border-transparent">
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full sm:hidden">
                            <div className={`w-1 h-full rounded-r-full ${urgency.barColor}`} />
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm sm:text-base leading-tight truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {item.template?.title || 'Аудит'}
                              </h3>

                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {/* Status Badge */}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] sm:text-[11px] gap-1 ${statusCfg.color}`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {statusCfg.label}
                                </Badge>

                                {/* Category Badge */}
                                {item.template?.category && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] sm:text-[11px] ${getCategoryBadgeStyle(item.template.category)}`}
                                  >
                                    {item.template.category}
                                  </Badge>
                                )}

                                {/* Score Badge (completed only) */}
                                {isCompleted && score != null && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] font-bold ${getScoreBadge(score).color}`}
                                  >
                                    <Target className="w-3 h-3" />
                                    {getScoreBadge(score).label}
                                  </Badge>
                                )}
                              </div>

                              {/* Meta info */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {item.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Срок: {formatDate(item.dueDate)}</span>
                                    {urgency.label && (
                                      <span className={`ml-0.5 ${urgency.color}`}>({urgency.label})</span>
                                    )}
                                  </span>
                                )}
                                {item.template?.questions && (
                                  <span className="flex items-center gap-1">
                                    <ListChecks className="w-3 h-3" />
                                    {item.template.questions.length} вопросов
                                  </span>
                                )}
                              </div>

                              {/* Notes */}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 rounded px-2 py-1.5">
                                  {item.notes}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {isStartable && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    size="sm"
                                    className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-0 text-xs"
                                    onClick={() => handleStartAudit(item)}
                                    disabled={startingAudit === item.id}
                                  >
                                    {startingAudit === item.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span className="hidden sm:inline">Начать</span>
                                      </>
                                    )}
                                  </Button>
                                </motion.div>
                              )}
                              {isCompleted && response && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs"
                                  onClick={() => {
                                    if (onViewReport) onViewReport(response.id);
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Просмотр</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── Footer Hint ─────────────────────────────────────────────── */}
      {!loading && filteredAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Показано {filteredAssignments.length} из {assignments.length} аудитов
          </p>
        </motion.div>
      )}
    </div>
  );
}
