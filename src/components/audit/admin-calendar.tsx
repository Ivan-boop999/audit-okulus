'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, CalendarDays,
  CheckCircle2, AlertTriangle, Play, Clock, Layers,
  User, Tag, ArrowRight, Eye,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  title: string;
  category: string;
}

interface Assignment {
  id: string;
  scheduledDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  template: Template;
  auditor: { id: string; name: string; email: string; department: string | null };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

const statusConfig: Record<string, { label: string; dotColor: string; color: string }> = {
  SCHEDULED: { label: 'Запланирован', dotColor: 'bg-blue-500', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  IN_PROGRESS: { label: 'В процессе', dotColor: 'bg-amber-500', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  COMPLETED: { label: 'Завершён', dotColor: 'bg-emerald-500', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  OVERDUE: { label: 'Просрочен', dotColor: 'bg-red-500', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800' },
  CANCELLED: { label: 'Отменён', dotColor: 'bg-slate-400', color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700' },
};

const avatarColors = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',
  'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getCategoryBadgeStyle(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('безопасность') || cat.includes('safety')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
  if (cat.includes('качество') || cat.includes('quality')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  if (cat.includes('окружающая') || cat.includes('эколог') || cat.includes('environment')) return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  if (cat.includes('техническое') || cat.includes('техник') || cat.includes('maintenance')) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  if (cat.includes('санитар') || cat.includes('гигиен') || cat.includes('hygiene')) return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
  if (cat.includes('электро') || cat.includes('electric')) return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch ALL assignments (no userId filter)
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assignments');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Не удалось загрузить расписание');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Map assignments by date
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    assignments.forEach((a) => {
      if (!a.scheduledDate) return;
      try {
        const dateKey = format(parseISO(a.scheduledDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        existing.push(a);
        map.set(dateKey, existing);
      } catch { /* skip */ }
    });
    return map;
  }, [assignments]);

  const selectedDateAssignments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return assignmentsByDate.get(dateKey) || [];
  }, [selectedDate, assignmentsByDate]);

  // Month stats
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = addDays(endOfMonth(currentMonth), 1);
    const monthAudits = assignments.filter((a) => {
      if (!a.scheduledDate) return false;
      try {
        const date = parseISO(a.scheduledDate);
        return (isAfter(date, startOfDay(monthStart)) || isSameDay(date, monthStart)) && isBefore(date, monthEnd);
      } catch { return false; }
    });
    return {
      total: monthAudits.length,
      completed: monthAudits.filter(a => a.status === 'COMPLETED').length,
      overdue: monthAudits.filter(a => a.status === 'OVERDUE').length,
      inProgress: monthAudits.filter(a => a.status === 'IN_PROGRESS').length,
    };
  }, [assignments, currentMonth]);

  const getAuditsForDay = (day: Date): Assignment[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return assignmentsByDate.get(dateKey) || [];
  };

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  // Unique auditors for summary
  const uniqueAuditors = useMemo(() => {
    const set = new Set(assignments.map(a => a.auditor?.name).filter(Boolean));
    return set.size;
  }, [assignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-500" />
            Календарь аудитов
          </h1>
          <p className="text-muted-foreground mt-1">
            Все запланированные аудиты по команде · {uniqueAuditors} аудиторов
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
          <Calendar className="w-4 h-4" />
          Сегодня
        </Button>
      </motion.div>

      {/* Calendar Card */}
      <motion.div key={currentMonth.toISOString()} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="h-9 w-9">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl font-bold tracking-tight">{monthLabel}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="h-9 w-9">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          {/* Stats bar */}
          {!loading && monthStats.total > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pb-3">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium">Всего:</span>
                  <span className="font-bold text-foreground">{monthStats.total}</span>
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">Завершено:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{monthStats.completed}</span>
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-muted-foreground">Просрочено:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{monthStats.overdue}</span>
                </div>
                {monthStats.inProgress > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <Play className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-muted-foreground">В процессе:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{monthStats.inProgress}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          <CardContent className="pt-0 pb-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square sm:aspect-[1.2] rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day) => {
                  const dayAudits = getAuditsForDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const hasAudits = dayAudits.length > 0;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className={`
                        relative flex flex-col items-center justify-start p-1 sm:p-2 min-h-[44px] sm:min-h-[64px]
                        transition-colors duration-150 text-sm
                        ${inMonth ? 'bg-card text-foreground' : 'bg-muted/30 text-muted-foreground/40'}
                        ${hasAudits && !isSelected && inMonth ? 'hover:bg-muted/80' : ''}
                        ${isSelected && inMonth ? 'bg-primary/10 ring-2 ring-primary ring-inset shadow-sm' : ''}
                        ${today && !isSelected && inMonth ? 'ring-2 ring-primary ring-inset' : ''}
                        ${today && isSelected && inMonth ? 'ring-2 ring-primary ring-inset' : ''}
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                      `}
                    >
                      {hasAudits && dayAudits.length > 1 && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none shadow-sm"
                        >
                          {dayAudits.length}
                        </motion.span>
                      )}

                      <span className={`text-xs sm:text-sm font-medium leading-none mb-0.5 sm:mb-1 ${today && inMonth ? 'text-primary font-bold' : ''} ${!inMonth ? 'opacity-40' : ''}`}>
                        {format(day, 'd')}
                      </span>

                      {today && !hasAudits && inMonth && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-auto" />}

                      {hasAudits && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {dayAudits.slice(0, 4).map((audit) => {
                            const cfg = statusConfig[audit.status] || statusConfig.SCHEDULED;
                            return (
                              <motion.span
                                key={audit.id}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 25 }}
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${cfg.dotColor} shadow-sm`}
                                title={`${audit.template?.title || 'Аудит'} — ${audit.auditor?.name || ''}`}
                              />
                            );
                          })}
                          {dayAudits.length > 4 && (
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium leading-none self-center">+{dayAudits.length - 4}</span>
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
              {Object.entries(statusConfig).slice(0, 4).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Date Detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={`sel-${format(selectedDate, 'yyyy-MM-dd')}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                    <Badge variant="secondary" className="ml-1">{selectedDateAssignments.length} аудитов</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground h-7">Закрыть</Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Calendar className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Нет аудитов на эту дату</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {selectedDateAssignments.map((audit) => {
                        const cfg = statusConfig[audit.status] || statusConfig.SCHEDULED;
                        return (
                          <motion.div
                            key={audit.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border hover:shadow-md transition-all duration-200 bg-card group"
                          >
                            {/* Auditor Avatar */}
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarFallback className={`${getAvatarColor(audit.auditor?.name || 'U')} text-xs font-bold`}>
                                {getInitials(audit.auditor?.name || 'U')}
                              </AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {audit.template?.title || 'Шаблон'}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {audit.auditor?.name || '—'}
                                </span>
                                {audit.template?.category && (
                                  <Badge variant="outline" className={`text-[10px] gap-1 py-0 ${getCategoryBadgeStyle(audit.template.category)}`}>
                                    <Tag className="w-2.5 h-2.5" />
                                    {audit.template.category}
                                  </Badge>
                                )}
                                <Badge variant="outline" className={`text-[10px] gap-1 py-0 ${cfg.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                                  {cfg.label}
                                </Badge>
                              </div>
                            </div>

                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
