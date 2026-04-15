'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Wrench, Calendar, AlertTriangle, CheckCircle2, Clock,
  Plus, Trash2, RefreshCw, Package, Search, Filter,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  format, differenceInDays, isBefore, startOfDay, parseISO,
} from 'date-fns';
import { ru } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  description: string | null;
  status: string;
  imageUrl: string | null;
}

interface MaintenanceReminder {
  equipmentId: string;
  dueDate: string;
  notes?: string;
}

const STORAGE_KEY = 'auditpro-maintenance';

// ─── Status helpers ──────────────────────────────────────────────────────────

type MaintenanceStatus = 'ok' | 'due-soon' | 'overdue' | 'no-date';

function getMaintenanceStatus(dueDate: string | null | undefined): MaintenanceStatus {
  if (!dueDate) return 'no-date';
  const now = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  const diff = differenceInDays(due, now);

  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'due-soon';
  return 'ok';
}

function getStatusConfig(status: MaintenanceStatus) {
  switch (status) {
    case 'ok':
      return {
        label: 'В норме',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
      };
    case 'due-soon':
      return {
        label: 'Скоро',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        icon: Clock,
      };
    case 'overdue':
      return {
        label: 'Просрочено',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
        icon: AlertTriangle,
      };
    default:
      return {
        label: 'Не задано',
        color: 'text-muted-foreground',
        bg: 'bg-muted/50',
        border: 'border-muted',
        dot: 'bg-muted-foreground',
        icon: Wrench,
      };
  }
}

function getDaysText(dueDate: string): string {
  const now = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  const diff = differenceInDays(due, now);

  if (diff < 0) return `Просрочено на ${Math.abs(diff)} дн.`;
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff <= 7) return `Через ${diff} дн.`;
  return `Через ${diff} дн.`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MaintenanceScheduler() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [reminders, setReminders] = useState<Record<string, MaintenanceReminder>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | MaintenanceStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // ── Fetch equipment ───────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchEquipment() {
      try {
        const res = await fetch('/api/equipment');
        if (res.ok) {
          const data = await res.json();
          setEquipment(Array.isArray(data) ? data : []);
        }
      } catch {
        toast.error('Ошибка загрузки оборудования');
      } finally {
        setLoading(false);
      }
    }
    fetchEquipment();
  }, []);

  // ── Load reminders from localStorage ──────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          setReminders(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveReminders = useCallback((newReminders: Record<string, MaintenanceReminder>) => {
    setReminders(newReminders);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newReminders));
    } catch {
      toast.error('Ошибка сохранения');
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSetReminder = useCallback(() => {
    if (!selectedEquipment || !newDueDate) return;

    const newReminders = {
      ...reminders,
      [selectedEquipment.id]: {
        equipmentId: selectedEquipment.id,
        dueDate: newDueDate,
        notes: newNotes.trim() || undefined,
      },
    };

    saveReminders(newReminders);
    setDialogOpen(false);
    setSelectedEquipment(null);
    setNewDueDate('');
    setNewNotes('');
    toast.success('Напоминание установлено', {
      description: `${selectedEquipment.name} — ${format(parseISO(newDueDate), 'd MMM yyyy', { locale: ru })}`,
    });
  }, [selectedEquipment, newDueDate, newNotes, reminders, saveReminders]);

  const handleRemoveReminder = useCallback((equipId: string, equipName: string) => {
    const { [equipId]: _, ...rest } = reminders;
    saveReminders(rest);
    toast.success('Напоминание удалено', { description: equipName });
  }, [reminders, saveReminders]);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filteredEquipment = equipment.filter((item) => {
    const reminder = reminders[item.id];
    const status = getMaintenanceStatus(reminder?.dueDate);

    if (filterStatus !== 'all' && status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    ok: Object.values(reminders).filter((r) => getMaintenanceStatus(r.dueDate) === 'ok').length,
    dueSoon: Object.values(reminders).filter((r) => getMaintenanceStatus(r.dueDate) === 'due-soon').length,
    overdue: Object.values(reminders).filter((r) => getMaintenanceStatus(r.dueDate) === 'overdue').length,
    noDate: equipment.length - Object.keys(reminders).length,
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="shimmer h-3 w-16 rounded mb-2" />
                <div className="shimmer h-7 w-10 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shimmer h-14 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/10 to-transparent border border-amber-500/10 p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Техническое обслуживание</h1>
            <p className="text-muted-foreground mt-0.5">
              Отслеживание и планирование ТО оборудования
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
            <div className="text-right">
              <div className="font-semibold text-foreground">{equipment.length} единиц</div>
              <div className="text-xs">в системе</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'В норме', count: stats.ok, color: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5', iconColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/40', icon: CheckCircle2 },
          { label: 'Скоро', count: stats.dueSoon, color: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5', iconColor: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/60 dark:border-amber-800/40', icon: Clock },
          { label: 'Просрочено', count: stats.overdue, color: 'from-red-500/10 to-rose-500/10 dark:from-red-500/5 dark:to-rose-500/5', iconColor: 'text-red-600 dark:text-red-400', border: 'border-red-200/60 dark:border-red-800/40', icon: AlertTriangle },
          { label: 'Не задано', count: stats.noDate, color: 'from-slate-500/10 to-gray-500/10 dark:from-slate-500/5 dark:to-gray-500/5', iconColor: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200/60 dark:border-slate-800/40', icon: Package },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 bg-gradient-to-br ${item.color} ${item.border} transition-all duration-200 hover:shadow-sm`}
            >
              <Icon className={`w-4.5 h-4.5 ${item.iconColor} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{item.label}</div>
                <div className={`text-lg font-bold leading-tight tabular-nums ${item.iconColor}`}>{item.count}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, коду, категории..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'overdue', 'due-soon', 'ok'] as const).map((status) => {
            const labels: Record<string, string> = {
              all: 'Все',
              overdue: 'Просрочено',
              'due-soon': 'Скоро',
              ok: 'В норме',
            };
            return (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setFilterStatus(status)}
              >
                {labels[status]}
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* Equipment Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Оборудование
          </CardTitle>
          <CardDescription>
            {filteredEquipment.length} из {equipment.length} единиц
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Wrench className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Оборудование не найдено</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <div className="space-y-2 pr-4">
                <AnimatePresence>
                  {filteredEquipment.map((item, idx) => {
                    const reminder = reminders[item.id];
                    const status = getMaintenanceStatus(reminder?.dueDate);
                    const config = getStatusConfig(status);
                    const StatusIcon = config.icon;

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md group ${config.bg} ${config.border}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Status indicator */}
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.border}`}>
                            <StatusIcon className={`w-4 h-4 ${config.color}`} />
                          </div>

                          {/* Equipment info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold truncate">{item.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {item.code}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.category}</span>
                              <span className="text-border">•</span>
                              <span>{item.location}</span>
                            </div>
                          </div>

                          {/* Maintenance date */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                            {reminder?.dueDate ? (
                              <div className="text-right">
                                <div className={`text-sm font-semibold ${config.color}`}>
                                  {format(parseISO(reminder.dueDate), 'd MMM yyyy', { locale: ru })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getDaysText(reminder.dueDate)}
                                </div>
                                {reminder.notes && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                                    {reminder.notes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Не назначено</div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              <Dialog
                                open={dialogOpen && selectedEquipment?.id === item.id}
                                onOpenChange={(open) => {
                                  setDialogOpen(open);
                                  if (open) {
                                    setSelectedEquipment(item);
                                    setNewDueDate(reminder?.dueDate || '');
                                    setNewNotes(reminder?.notes || '');
                                  } else {
                                    setSelectedEquipment(null);
                                    setNewDueDate('');
                                    setNewNotes('');
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                  >
                                    <Calendar className="w-3 h-3" />
                                    {reminder?.dueDate ? 'Изменить' : 'Назначить'}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Wrench className="w-5 h-5 text-primary" />
                                      Техническое обслуживание
                                    </DialogTitle>
                                    <DialogDescription>
                                      {item.name} ({item.code})
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                      <Label htmlFor="due-date">Дата следующего ТО</Label>
                                      <Input
                                        id="due-date"
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="notes">Примечание (необязательно)</Label>
                                      <Input
                                        id="notes"
                                        placeholder="Тип работ, детали..."
                                        value={newNotes}
                                        onChange={(e) => setNewNotes(e.target.value)}
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Отмена
                                      </Button>
                                      <Button
                                        onClick={handleSetReminder}
                                        disabled={!newDueDate}
                                      >
                                        Сохранить
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {reminder?.dueDate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveReminder(item.id, item.name)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
