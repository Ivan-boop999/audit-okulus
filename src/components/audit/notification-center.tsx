'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Search, ExternalLink, Check, Filter,
  Trash2, Inbox, Clock, AlertCircle, AlertTriangle,
  Info, Sparkles, ArrowUpDown, ChevronDown, Mail,
  CheckCheck2, Eye, EyeOff, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { format, parseISO, isToday, isYesterday, subDays, startOfWeek, endOfWeek, isAfter, isBefore, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface NotificationCenterProps {
  isAdmin?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const typeFilters = [
  { value: 'ALL', label: 'Все' },
  { value: 'ASSIGNMENT', label: 'Назначения' },
  { value: 'REMINDER', label: 'Напоминания' },
  { value: 'OVERDUE', label: 'Просрочено' },
  { value: 'SUCCESS', label: 'Успех' },
  { value: 'WARNING', label: 'Внимание' },
  { value: 'INFO', label: 'Информация' },
] as const;

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ASSIGNMENT: { label: 'Назначение', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/50', icon: Mail },
  REMINDER: { label: 'Напоминание', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/50', icon: Clock },
  OVERDUE: { label: 'Просрочено', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/50', icon: AlertTriangle },
  SUCCESS: { label: 'Успех', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/50', icon: CheckCircle2 },
  INFO: { label: 'Информация', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50', icon: Info },
  WARNING: { label: 'Внимание', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/50', icon: AlertCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  if (isToday(date)) return format(date, 'HH:mm', { locale: ru });
  if (isYesterday(date)) return 'Вчера в ' + format(date, 'HH:mm', { locale: ru });
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  return format(date, 'd MMM', { locale: ru });
}

function getTimeGroup(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  if (isAfter(date, startOfWeek(new Date(), { weekStartsOn: 1 })) && isBefore(date, weekEnd)) return 'На этой неделе';
  return 'Ранее';
}

function getTimeGroupOrder(group: string): number {
  const order: Record<string, number> = { 'Сегодня': 0, 'Вчера': 1, 'На этой неделе': 2, 'Ранее': 3 };
  return order[group] ?? 4;
}

// ─── Animation ──────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function NotificationCenter({ isAdmin = false }: NotificationCenterProps) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [visibleCount, setVisibleCount] = useState(30);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (res.ok) setNotifications(await res.json());
      } catch {
        toast.error('Не удалось загрузить уведомления');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, [user?.id]);

  // Stats
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = totalCount - unreadCount;

  // Filtered and sorted
  const filtered = useMemo(() => {
    let items = [...notifications];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(n =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      items = items.filter(n => n.type === typeFilter);
    }

    // Sort
    items.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'newest' ? diff : -diff;
    });

    return items;
  }, [notifications, searchQuery, typeFilter, sortOrder]);

  // Grouped
  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of filtered) {
      const group = getTimeGroup(n.createdAt);
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(n);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => getTimeGroupOrder(a) - getTimeGroupOrder(b))
      .map(([label, items]) => ({ label, items }));
  }, [filtered]);

  const visibleGroups = useMemo(() => {
    const result: { label: string; items: Notification[] }[] = [];
    let count = 0;
    for (const group of groups) {
      if (count >= visibleCount) break;
      const remaining = visibleCount - count;
      result.push({ label: group.label, items: group.items.slice(0, remaining) });
      count += group.items.slice(0, remaining).length;
    }
    return result;
  }, [groups, visibleCount]);

  const hasMore = filtered.length > visibleCount;

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.isRead).map(n =>
          fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: n.id, isRead: true }),
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Все уведомления прочитаны');
    } catch {
      toast.error('Ошибка при отметке');
    }
  }, [notifications]);

  // Toggle read status
  const handleToggleRead = useCallback(async (notif: Notification) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, isRead: !notif.isRead }),
      });
      setNotifications(prev => prev.map(n =>
        n.id === notif.id ? { ...n, isRead: !n.isRead } : n
      ));
    } catch {
      toast.error('Ошибка');
    }
  }, []);

  // Delete read notifications
  const handleDeleteRead = useCallback(async () => {
    try {
      const readIds = notifications.filter(n => n.isRead).map(n => n.id);
      if (readIds.length === 0) return;
      await fetch(`/api/notifications?ids=${readIds.join(',')}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => !n.isRead));
      toast.success(`Удалено ${readIds.length} уведомлений`);
    } catch {
      toast.error('Ошибка при удалении');
    }
  }, [notifications]);

  // Load more
  const handleLoadMore = () => setVisibleCount(prev => prev + 30);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-4 w-32 shimmer rounded mb-3" /><div className="h-20 shimmer rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────

  if (filtered.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Центр уведомлений</h1>
            <p className="text-muted-foreground mt-1">Управление всеми уведомлениями в одном месте</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
          >
            <BellOff className="w-8 h-8 text-muted-foreground/40" />
          </motion.div>
          <h3 className="text-lg font-semibold text-muted-foreground">Нет уведомлений</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {searchQuery || typeFilter !== 'ALL'
              ? 'Ничего не найдено по заданным фильтрам'
              : 'У вас пока нет уведомлений'}
          </p>
        </div>
      </div>
    );
  }

  const typeConfigFor = (type: string) => typeConfig[type] || typeConfig.INFO;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Центр уведомлений</h1>
            <p className="text-muted-foreground mt-1">
              Всего: {totalCount} · Непрочитанных:{' '}
              <span className="font-semibold text-primary">{unreadCount}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck2 className="w-4 h-4" />
              Прочитать все
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleDeleteRead}
              disabled={readCount === 0}
            >
              <Trash2 className="w-4 h-4" />
              Очистить
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по заголовку или тексту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            {/* Type filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {typeFilters.map(tf => (
                <Button
                  key={tf.value}
                  variant={typeFilter === tf.value ? 'default' : 'outline'}
                  size="sm"
                  className={`whitespace-nowrap text-xs h-8 ${typeFilter === tf.value ? 'shadow-sm' : ''}`}
                  onClick={() => setTypeFilter(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            {/* Sort */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 whitespace-nowrap text-xs h-8"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}
            </Button>
          </div>

          {/* Active filter summary */}
          {(searchQuery || typeFilter !== 'ALL') && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>
                Найдено: <span className="font-semibold text-foreground">{filtered.length}</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{unreadCount} новых</Badge>
                )}
              </span>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Notification Groups */}
      <div className="space-y-6">
        {visibleGroups.map((group, gi) => {
          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: gi * 0.08 }}
            >
              {/* Group label */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-border/50" />
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {group.items.length}
                </Badge>
              </div>

              {/* Notification cards */}
              <div className="space-y-2">
                {group.items.map((notif, ni) => {
                  const cfg = typeConfigFor(notif.type);
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={notif.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: ni * 0.04 }}
                    >
                      <Card
                        className={`overflow-hidden transition-all duration-200 hover:shadow-md group ${
                          !notif.isRead
                            ? 'border-l-[3px] border-l-primary/60 bg-primary/[0.02]'
                            : 'border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} transition-colors`}>
                              <Icon className={`w-5 h-5 ${cfg.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Type badge */}
                                <Badge variant="outline" className={`text-[10px] font-medium ${cfg.color} border-current/20`}>
                                  {cfg.label}
                                </Badge>

                                {/* Unread dot */}
                                {!notif.isRead && (
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                )}

                                {/* Title */}
                                <span className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold' : 'font-medium text-foreground/80'}`}>
                                  {notif.title}
                                </span>
                              </div>

                              {/* Message */}
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>

                              {/* Meta + actions */}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] text-muted-foreground/60">
                                  {formatRelativeDate(notif.createdAt)}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Toggle read */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleToggleRead(notif)}
                                    title={notif.isRead ? 'Отметить как непрочитанное' : 'Отметить как прочитанное'}
                                  >
                                    {notif.isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </Button>

                                  {/* External link */}
                                  {notif.link && (
                                    <a
                                      href={notif.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
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
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleLoadMore}
          >
            Показать ещё
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bottom summary */}
      <div className="text-center text-xs text-muted-foreground/60 pt-2">
        Показано {Math.min(visibleCount, filtered.length)} из {filtered.length} уведомлений
      </div>
    </div>
  );
}
