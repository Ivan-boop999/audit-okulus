'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2,
  AlertTriangle, Play, CalendarDays, FileQuestion,
  ClipboardList, ArrowRight,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek, parseISO, isAfter, isBefore,
  startOfDay, endOfDay, addDays,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Auditor {
  id: string;
  name: string;
  email: string;
  department?: string | null;
}

interface Question {
  id: string;
  text: string;
  type: string;
  order: number;
}

interface Template {
  id: string;
  title: string;
  category: string;
  status: string;
  frequency?: string | null;
  questions?: Question[];
}

interface Response {
  id: string;
  status: string;
  answers: { id: string; questionId: string; value: string }[];
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

interface AuditorCalendarProps {
  userId: string;
  onStartAudit?: (assignmentId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; dotColor: string; bgCell: string }
> = {
  SCHEDULED: {
    label: 'Запланирован',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CalendarDays,
    dotColor: 'bg-blue-500',
    bgCell: 'bg-blue-50/60 dark:bg-blue-950/30',
  },
  IN_PROGRESS: {
    label: 'В процессе',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Play,
    dotColor: 'bg-amber-500',
    bgCell: 'bg-amber-50/60 dark:bg-amber-950/30',
  },
  COMPLETED: {
    label: 'Завершён',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    bgCell: 'bg-emerald-50/60 dark:bg-emerald-950/30',
  },
  OVERDUE: {
    label: 'Просрочен',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
    dotColor: 'bg-red-500',
    bgCell: 'bg-red-50/60 dark:bg-red-950/30',
  },
  CANCELLED: {
    label: 'Отменён',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: Clock,
    dotColor: 'bg-slate-400',
    bgCell: 'bg-slate-50/40 dark:bg-slate-950/20',
  },
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const listVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
};

const calendarTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRu(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: ru });
}

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM', { locale: ru });
  } catch {
    return dateStr;
  }
}

function getQuestionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TEXT: 'Текстовый',
    NUMBER: 'Числовой',
    SELECT: 'Выбор',
    MULTI_SELECT: 'Множественный выбор',
    CHECKBOX: 'Флажок',
    YES_NO: 'Да / Нет',
    DATE: 'Дата',
    PHOTO: 'Фото',
    SIGNATURE: 'Подпись',
  };
  return map[type] || type;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditorCalendar({ userId, onStartAudit }: AuditorCalendarProps) {
  // Data state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Assignment | null>(null);
  const [startingAudit, setStartingAudit] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assignments?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Не удалось загрузить расписание аудитов');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ─── Calendar Helpers ────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Map of date string -> assignments for quick lookup
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    assignments.forEach((a) => {
      if (!a.scheduledDate) return;
      try {
        const dateKey = format(parseISO(a.scheduledDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        existing.push(a);
        map.set(dateKey, existing);
      } catch {
        // skip invalid dates
      }
    });
    return map;
  }, [assignments]);

  // Assignments for the selected date
  const selectedDateAssignments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return assignmentsByDate.get(dateKey) || [];
  }, [selectedDate, assignmentsByDate]);

  // Upcoming audits (from today onwards, sorted by date)
  const upcomingAudits = useMemo(() => {
    const today = startOfDay(new Date());
    return assignments
      .filter((a) => {
        if (a.status === 'CANCELLED' || a.status === 'COMPLETED') return false;
        try {
          return isAfter(parseISO(a.scheduledDate), today) || isSameDay(parseISO(a.scheduledDate), today);
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 10);
  }, [assignments]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleDayClick = (day: Date) => {
    setSelectedDate((prev) => (prev && isSameDay(prev, day) ? null : day));
  };

  const handleAuditClick = (assignment: Assignment) => {
    setSelectedAudit(assignment);
    setDetailOpen(true);
  };

  const handleStartAudit = async () => {
    if (!selectedAudit) return;

    // Update status to IN_PROGRESS
    setStartingAudit(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAudit.id, status: 'IN_PROGRESS' }),
      });
      if (!res.ok) throw new Error('Status update failed');

      setDetailOpen(false);
      toast.success(`Аудит «${selectedAudit.template?.title}» начат`);

      // Refresh data
      fetchAssignments();

      // Notify parent
      if (onStartAudit) {
        onStartAudit(selectedAudit.id);
      }
    } catch {
      toast.error('Не удалось начать аудит');
    } finally {
      setStartingAudit(false);
    }
  };

  // Get audits for a specific calendar day
  const getAuditsForDay = (day: Date): Assignment[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return assignmentsByDate.get(dateKey) || [];
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Календарь аудитов</h1>
          <p className="text-muted-foreground mt-1">
            Ваше расписание запланированных проверок
          </p>
        </div>
        <Button
          variant="outline"
          onClick={goToToday}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          <Calendar className="w-4 h-4" />
          Сегодня
        </Button>
      </div>

      {/* Calendar Card */}
      <motion.div
        key={currentMonth.toISOString()}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={calendarTransition}
      >
        <Card className="overflow-hidden">
          {/* Calendar Header - Month Navigation */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevMonth}
                className="h-9 w-9 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="text-center">
                <CardTitle className="text-xl font-bold tracking-tight">
                  {monthLabel}
                </CardTitle>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-9 w-9 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square sm:aspect-[1.2] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day) => {
                  const dayAudits = getAuditsForDay(day);
                  const inCurrentMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const hasAudits = dayAudits.length > 0;

                  // Determine cell background based on audit statuses
                  let cellBg = '';
                  if (hasAudits) {
                    const highestPriority = dayAudits.some((a) => a.status === 'OVERDUE')
                      ? 'OVERDUE'
                      : dayAudits.some((a) => a.status === 'IN_PROGRESS')
                        ? 'IN_PROGRESS'
                        : dayAudits[0].status;
                    cellBg = statusConfig[highestPriority]?.bgCell || '';
                  }

                  return (
                    <motion.button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className={`
                        relative flex flex-col items-center justify-start p-1 sm:p-2 min-h-[44px] sm:min-h-[64px]
                        transition-colors duration-150 text-sm
                        ${inCurrentMonth ? 'bg-card text-foreground' : 'bg-muted/30 text-muted-foreground/40'}
                        ${hasAudits && !isSelected ? `hover:bg-muted/80 ${cellBg}` : ''}
                        ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500 ring-inset' : ''}
                        ${today && !isSelected ? 'ring-2 ring-emerald-400 ring-inset' : ''}
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset
                      `}
                    >
                      {/* Day number */}
                      <span
                        className={`
                          text-xs sm:text-sm font-medium leading-none mb-0.5 sm:mb-1
                          ${today ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''}
                          ${!inCurrentMonth ? 'opacity-40' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Today indicator dot */}
                      {today && !hasAudits && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-auto" />
                      )}

                      {/* Audit dots */}
                      {hasAudits && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {dayAudits.slice(0, 4).map((audit) => {
                            const cfg = statusConfig[audit.status] || statusConfig.SCHEDULED;
                            return (
                              <motion.span
                                key={audit.id}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 25 }}
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${cfg.dotColor} shadow-sm`}
                                title={audit.template?.title || 'Аудит'}
                              />
                            );
                          })}
                          {dayAudits.length > 4 && (
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium leading-none self-center">
                              +{dayAudits.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 px-1">
              <span className="text-xs text-muted-foreground font-medium">Статусы:</span>
              {(
                [
                  { key: 'SCHEDULED', label: 'Запланирован' },
                  { key: 'IN_PROGRESS', label: 'В процессе' },
                  { key: 'COMPLETED', label: 'Завершён' },
                  { key: 'OVERDUE', label: 'Просрочен' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[key].dotColor}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Date Audits */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={`selected-${format(selectedDate, 'yyyy-MM-dd')}`}
            variants={listVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    {formatDateRu(selectedDate)}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-muted-foreground h-7"
                  >
                    Закрыть
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateAssignments.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Нет аудитов на эту дату</p>
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {selectedDateAssignments.map((audit) => {
                      const cfg = statusConfig[audit.status] || statusConfig.SCHEDULED;
                      const StatusIcon = cfg.icon;

                      return (
                        <motion.div key={audit.id} variants={itemVariants}>
                          <button
                            onClick={() => handleAuditClick(audit)}
                            className="w-full text-left rounded-xl border p-3 sm:p-4 hover:shadow-md transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 bg-card group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-colors ${cfg.color}`}
                              >
                                <StatusIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                  {audit.template?.title || 'Шаблон'}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] gap-1 py-0 ${cfg.color}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                                    {cfg.label}
                                  </Badge>
                                  {audit.dueDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      до {formatDateShort(audit.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            {audit.notes && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 rounded px-2 py-1.5">
                                {audit.notes}
                              </p>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Audits List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            Предстоящие аудиты
            {!loading && upcomingAudits.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              >
                {upcomingAudits.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingAudits.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                <Calendar className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Нет предстоящих аудитов
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Когда будут назначены аудиты, они появятся здесь
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {upcomingAudits.map((audit) => {
                const cfg = statusConfig[audit.status] || statusConfig.SCHEDULED;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div key={audit.id} variants={itemVariants}>
                    <button
                      onClick={() => handleAuditClick(audit)}
                      className="w-full text-left rounded-xl border p-3 hover:shadow-md transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 bg-card group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Date badge */}
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
                            {tryFormatDay(audit.scheduledDate)}
                          </span>
                          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 leading-none mt-0.5">
                            {tryFormatMonth(audit.scheduledDate)}
                          </span>
                        </div>

                        {/* Audit info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {audit.template?.title || 'Шаблон'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] gap-1 py-0 ${cfg.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {audit.template?.questions?.length || 0} вопросов
                            </span>
                          </div>
                        </div>

                        {/* Start / Arrow */}
                        <div className="flex-shrink-0">
                          {audit.status === 'SCHEDULED' ? (
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                          ) : (
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* ─── Audit Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {selectedAudit && (() => {
            const cfg = statusConfig[selectedAudit.status] || statusConfig.SCHEDULED;
            const StatusIcon = cfg.icon;
            const questions = selectedAudit.template?.questions || [];
            const responses = selectedAudit.responses || [];
            const completedCount = responses.filter(
              (r) => r.status === 'COMPLETED' || r.answers?.length > 0,
            ).length;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    {selectedAudit.template?.title || 'Аудит'}
                  </DialogTitle>
                  <DialogDescription>
                    Детали назначенного аудита
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <Badge variant="outline" className={`gap-1.5 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </Badge>
                      {selectedAudit.status === 'IN_PROGRESS' && responses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ответов: {completedCount} из {questions.length}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Template info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-emerald-600" />
                      Шаблон аудита
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{selectedAudit.template?.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Категория: {selectedAudit.template?.category || '—'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {questions.length} вопр.
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Schedule info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      Расписание
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">Плановая дата</p>
                        <p className="text-sm font-medium">
                          {selectedAudit.scheduledDate
                            ? format(parseISO(selectedAudit.scheduledDate), 'd MMMM yyyy', { locale: ru })
                            : '—'}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">Дедлайн</p>
                        <p className="text-sm font-medium">
                          {selectedAudit.dueDate
                            ? format(parseISO(selectedAudit.dueDate), 'd MMMM yyyy', { locale: ru })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Questions list */}
                  {questions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileQuestion className="w-4 h-4 text-emerald-600" />
                        Вопросы ({questions.length})
                      </h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1.5 pr-3">
                          {questions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <span className="flex-shrink-0 w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm leading-snug">{q.text}</p>
                                <Badge variant="outline" className="text-[9px] mt-1 py-0 px-1.5">
                                  {getQuestionTypeLabel(q.type)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedAudit.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Заметки</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">
                        {selectedAudit.notes}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setDetailOpen(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Закрыть
                  </Button>
                  {(selectedAudit.status === 'SCHEDULED' || selectedAudit.status === 'IN_PROGRESS') && (
                    <Button
                      onClick={handleStartAudit}
                      disabled={startingAudit}
                      className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      {startingAudit ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      {selectedAudit.status === 'IN_PROGRESS' ? 'Продолжить' : 'Начать аудит'}
                    </Button>
                  )}
                  {selectedAudit.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium px-3">
                      <CheckCircle2 className="w-4 h-4" />
                      Аудит завершён
                    </div>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Small helpers outside component ──────────────────────────────────────────

function tryFormatDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd');
  } catch {
    return '—';
  }
}

function tryFormatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM', { locale: ru });
  } catch {
    return '';
  }
}
