'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard, Wrench, FileText, CalendarDays, BarChart3,
  Bell, User, LogOut, Moon, Sun, Menu, X, ChevronLeft,
  Factory, Search, History, UserCircle, ListChecks, Wifi, WifiOff, Users,
  BookOpen, Settings, ChevronDown, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import ScoringGuide from './scoring-guide';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AppShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

// ─── Navigation Groups ────────────────────────────────────────────────────────

interface NavGroup {
  label: string;
  items: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: 'Основное',
    items: [
      { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { id: 'equipment', label: 'Оборудование', icon: Wrench },
      { id: 'templates', label: 'Шаблоны аудитов', icon: FileText },
      { id: 'scheduling', label: 'Расписание', icon: CalendarDays },
    ],
  },
  {
    label: 'Управление',
    items: [
      { id: 'team', label: 'Команда', icon: Users },
      { id: 'action-plans', label: 'План действий', icon: ListChecks },
    ],
  },
  {
    label: 'Отчёты',
    items: [
      { id: 'history', label: 'История аудитов', icon: History },
      { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    ],
  },
];

const auditorNavGroups: NavGroup[] = [
  {
    label: 'Аудиты',
    items: [
      { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
      { id: 'calendar', label: 'Календарь', icon: CalendarDays },
      { id: 'audits', label: 'Мои аудиты', icon: FileText },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { id: 'action-plans', label: 'План действий', icon: ListChecks },
      { id: 'history', label: 'История', icon: History },
    ],
  },
];

// ─── Notification config ──────────────────────────────────────────────────────

const notifTypes: Record<string, string> = {
  ASSIGNMENT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  REMINDER: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  INFO: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  WARNING: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
};

const notifLabels: Record<string, string> = {
  ASSIGNMENT: 'Назначение',
  REMINDER: 'Напоминание',
  OVERDUE: 'Просрочено',
  SUCCESS: 'Успех',
  INFO: 'Информация',
  WARNING: 'Внимание',
};

// ─── Avatar color palette ─────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppShell({ children, activeView, onViewChange }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [guideOpen, setGuideOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const navGroups = isAdmin ? adminNavGroups : auditorNavGroups;

  // Load notifications
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
        }
      } catch {
        // Silent fail
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Notification sound
  useEffect(() => {
    if (unreadCount > 0) {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } catch {
        // Audio not supported
      }
    }
  }, [unreadCount]);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
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
      setUnreadCount(0);
      toast.success('Все уведомления прочитаны');
    } catch {
      // Silent fail
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Вы вышли из системы');
  };

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group notifications by time period
  const getGroupedNotifications = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: Notification[] }[] = [
      { label: 'Сегодня', items: [] },
      { label: 'Вчера', items: [] },
      { label: 'На этой неделе', items: [] },
      { label: 'Ранее', items: [] },
    ];

    for (const n of notifications) {
      const date = new Date(n.createdAt);
      if (date >= today) groups[0].items.push(n);
      else if (date >= yesterday) groups[1].items.push(n);
      else if (date >= weekAgo) groups[2].items.push(n);
      else groups[3].items.push(n);
    }

    return groups.filter(g => g.items.length > 0);
  };

  // Render nav item with optional tooltip
  const renderNavItem = (
    item: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string },
    isCollapsed: boolean,
    isMobile: boolean,
  ) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;
    const button = (
      <motion.button
        key={item.id}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onViewChange(item.id)}
        className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 group relative ${
          isActive
            ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/15'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        {/* Active indicator bar */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`} />
        {!isCollapsed || isMobile ? (
          <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>
        ) : null}
        {item.badge && !isCollapsed && (
          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5 font-medium">
            {item.badge}
          </Badge>
        )}
      </motion.button>
    );

    if (isCollapsed && !isMobile) {
      return (
        <TooltipProvider key={item.id} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={item.id}>{button}</div>;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex bg-muted/30">
        {/* ─── Desktop Sidebar ─── */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 260 : 72 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="hidden lg:flex flex-col border-r bg-card/95 backdrop-blur-sm shadow-sm fixed h-full z-30"
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                <Factory className="w-5 h-5 text-primary-foreground" />
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex flex-col whitespace-nowrap"
                  >
                    <span className="font-bold text-lg leading-none tracking-tight">AuditPro</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">v2.1</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation groups */}
          <ScrollArea className="flex-1 py-3">
            <nav className="space-y-5 px-3">
              {navGroups.map((group, gi) => (
                <div key={group.label}>
                  {/* Group label */}
                  {sidebarOpen && (
                    <div className="px-3 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {group.label}
                      </span>
                    </div>
                  )}
                  {/* Nav items */}
                  <div className="space-y-0.5">
                    {group.items.map(item => renderNavItem(item, !sidebarOpen, false))}
                  </div>
                  {/* Separator between groups (not after last) */}
                  {gi < navGroups.length - 1 && sidebarOpen && (
                    <Separator className="mt-3 opacity-50" />
                  )}
                </div>
              ))}

              {/* Scoring Guide button */}
              <div className="pt-2">
                {sidebarOpen ? (
                  <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-10 px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <BookOpen className="w-[18px] h-[18px]" />
                        <span className="text-[13px] font-medium">Справочник</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary" />
                          Справочник оценок
                        </DialogTitle>
                        <DialogDescription>
                          Подробная информация о системе оценивания и типах вопросов
                        </DialogDescription>
                      </DialogHeader>
                      <ScoringGuide />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-10 h-10 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                              <BookOpen className="w-[18px] h-[18px]" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Справочник оценок
                              </DialogTitle>
                              <DialogDescription>
                                Подробная информация о системе оценивания
                              </DialogDescription>
                            </DialogHeader>
                            <ScoringGuide />
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
                        Справочник
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </nav>
          </ScrollArea>

          {/* Collapse button */}
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <ChevronLeft className="w-4 h-4" />
              </motion.div>
            </Button>
          </div>
        </motion.aside>

        {/* ─── Mobile Sidebar ─── */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-card z-50 shadow-xl"
              >
                <div className="h-16 flex items-center justify-between px-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                      <Factory className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">AuditPro</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 py-3">
                  <nav className="space-y-5 px-3">
                    {navGroups.map((group, gi) => (
                      <div key={group.label}>
                        <div className="px-3 mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map(item => renderNavItem(item, false, true))}
                        </div>
                        {gi < navGroups.length - 1 && (
                          <Separator className="mt-3 opacity-50" />
                        )}
                      </div>
                    ))}
                    {/* Mobile scoring guide */}
                    <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-10 px-3 text-muted-foreground"
                        >
                          <BookOpen className="w-[18px] h-[18px]" />
                          <span className="text-[13px] font-medium">Справочник</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Справочник оценок
                          </DialogTitle>
                        </DialogHeader>
                        <ScoringGuide />
                      </DialogContent>
                    </Dialog>
                  </nav>
                </ScrollArea>

                {/* Mobile user info */}
                <div className="border-t p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`${getAvatarColor(user?.name || 'U')} text-sm font-bold`}>
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{user?.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ─── Main Content ─── */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'}`}>
          {/* Header */}
          <header className="h-16 border-b bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>

              {/* Live clock + connection */}
              <div className="hidden lg:flex items-center gap-2 ml-1">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium tabular-nums transition-colors ${
                  isOnline
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'text-red-500 bg-red-50 dark:bg-red-950/30'
                }`}>
                  <span className={`relative flex h-1.5 w-1.5 ${isOnline ? '' : ''}`}>
                    {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </span>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {currentTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 relative text-muted-foreground"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-red-500/30"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </Button>

                {/* Notification dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-[380px] bg-card rounded-xl border shadow-xl z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-4 py-3 flex items-center justify-between border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">Уведомления</h3>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={markAllAsRead}>
                            Отметить все
                          </Button>
                        )}
                      </div>

                      {/* Notifications list */}
                      <ScrollArea className="max-h-80">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                              <Bell className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Нет уведомлений</p>
                          </div>
                        ) : (
                          <div>
                            {getGroupedNotifications().map(group => (
                              <div key={group.label}>
                                <div className="px-4 py-1.5 bg-muted/20">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                                </div>
                                <div className="divide-y">
                                  {group.items.map((notif) => (
                                    <motion.div
                                      key={notif.id}
                                      whileHover={{ backgroundColor: 'var(--accent)' }}
                                      className={`px-4 py-3 cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary/[0.03]' : ''}`}
                                      onClick={() => markAsRead(notif.id)}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-[10px] font-bold ${notifTypes[notif.type] || notifTypes.INFO}`}>
                                          {notifLabels[notif.type]?.[0] || 'i'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[13px] leading-tight ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                                              {notif.title}
                                            </span>
                                            {!notif.isRead && (
                                              <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                          </p>
                                          <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                                            {new Date(notif.createdAt).toLocaleString('ru-RU', {
                                              hour: '2-digit', minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator orientation="vertical" className="h-6 mx-1" />

              {/* User dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2 gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className={`${isAdmin ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : getAvatarColor(user?.name || 'U')} text-[11px] font-bold`}>
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-[13px] font-medium leading-none">{user?.name}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {isAdmin ? 'Администратор' : user?.department || 'Аудитор'}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewChange('profile')} className="gap-2 cursor-pointer">
                    <UserCircle className="w-4 h-4" />
                    Профиль
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                    <LogOut className="w-4 h-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="p-4 lg:p-6"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="border-t bg-card/60 backdrop-blur-sm px-4 lg:px-6 py-3 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-primary to-primary/80 rounded flex items-center justify-center shadow-sm">
                  <Factory className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="font-medium text-foreground/80">AuditPro</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {isAdmin ? 'Администратор' : user?.department || 'Аудитор'}
                </span>
                <Separator orientation="vertical" className="h-3" />
                <span className="tabular-nums">v2.1</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
