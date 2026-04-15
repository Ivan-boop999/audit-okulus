'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard, Wrench, FileText, CalendarDays, BarChart3,
  Bell, User, LogOut, Moon, Sun, Menu, X, ChevronLeft,
  Shield, Factory, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

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

const adminNavItems = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { id: 'equipment', label: 'Оборудование', icon: Wrench },
  { id: 'templates', label: 'Шаблоны аудитов', icon: FileText },
  { id: 'scheduling', label: 'Расписание', icon: CalendarDays },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
];

const auditorNavItems = [
  { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
  { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  { id: 'audits', label: 'Мои аудиты', icon: FileText },
];

const notifTypes: Record<string, string> = {
  ASSIGNMENT: 'bg-blue-100 text-blue-700 border-blue-200',
  REMINDER: 'bg-amber-100 text-amber-700 border-amber-200',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INFO: 'bg-slate-100 text-slate-700 border-slate-200',
  WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
};

const notifLabels: Record<string, string> = {
  ASSIGNMENT: 'Назначение',
  REMINDER: 'Напоминание',
  OVERDUE: 'Просрочено',
  SUCCESS: 'Успех',
  INFO: 'Информация',
  WARNING: 'Внимание',
};

export default function AppShell({ children, activeView, onViewChange }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? adminNavItems : auditorNavItems;

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

  const playNotificationSound = () => {
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
  };

  // Play notification sound when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      playNotificationSound();
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col border-r bg-card shadow-sm fixed h-full z-30"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Factory className="w-5 h-5 text-primary-foreground" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-lg whitespace-nowrap"
                >
                  AuditPro
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav items */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse button */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
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
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                    <Factory className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg">AuditPro</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 py-4">
                <nav className="space-y-1 px-3">
                  {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { onViewChange(item.id); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>

              {/* Mobile user info */}
              <div className="border-t p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} text-sm font-bold`}>
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

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'}`}>
        {/* Top bar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
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
                className="h-9 w-9 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center pulse-glow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification panel */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-card rounded-xl border shadow-lg z-50 overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between border-b">
                      <h3 className="font-semibold text-sm">Уведомления</h3>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                          Прочитать все
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="max-h-80">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          Нет уведомлений
                        </div>
                      ) : (
                        <div className="divide-y">
                          {notifications.slice(0, 10).map((notif) => (
                            <motion.div
                              key={notif.id}
                              whileHover={{ backgroundColor: 'oklch(0.97 0.005 160)' }}
                              className={`p-3 cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-[10px] font-bold ${notifTypes[notif.type] || notifTypes.INFO}`}>
                                  {notifLabels[notif.type]?.[0] || 'i'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                                      {notif.title}
                                    </span>
                                    {!notif.isRead && (
                                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {notif.message}
                                  </p>
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    {new Date(notif.createdAt).toLocaleString('ru-RU')}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* User menu */}
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className={`${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} text-xs font-bold`}>
                  {getInitials(user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium leading-none">{user?.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isAdmin ? 'Администратор' : user?.department || 'Аудитор'}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
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
      </div>
    </div>
  );
}
