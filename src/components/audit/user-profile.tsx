'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Clock,
  CheckCircle2,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  Calendar,
  Award,
  TrendingUp,
  LogOut,
  Info,
  LayoutGrid,
  Monitor,
 Fingerprint,
 Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserPreferences {
  notificationSounds: boolean;
  compactMode: boolean;
  language: string;
}

interface UserStats {
  auditsCompleted: number;
  auditsPending: number;
  memberSince: string;
  completionRate: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return { notificationSounds: true, compactMode: false, language: 'ru' };
  }
  try {
    const stored = localStorage.getItem('auditpro-prefs');
    if (stored) {
      return JSON.parse(stored) as UserPreferences;
    }
  } catch {
    // ignore parse errors
  }
  return { notificationSounds: true, compactMode: false, language: 'ru' };
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem('auditpro-prefs', JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

// ─── Animation variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Mock stats generator ───────────────────────────────────────────────────

function generateMockStats(userRole: string): UserStats {
  if (userRole === 'ADMIN') {
    return {
      auditsCompleted: 156,
      auditsPending: 12,
      memberSince: '2023-01-15',
      completionRate: 94,
    };
  }
  return {
    auditsCompleted: 87,
    auditsPending: 5,
    memberSince: '2023-06-20',
    completionRate: 91,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UserProfilePanel() {
  const { user, logout } = useAuthStore();
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
  const [activeTab, setActiveTab] = useState('settings');

  // ── Session info ─────────────────────────────────────────────────────
  const sessionInfo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return {
      browser: navigator.userAgent.includes('Chrome') ? 'Google Chrome' :
        navigator.userAgent.includes('Firefox') ? 'Mozilla Firefox' :
        navigator.userAgent.includes('Safari') ? 'Apple Safari' : 'Другой',
      loginTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      platform: navigator.platform,
      lastActivity: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
  }, []);

  // Sync preferences to localStorage on change
  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  // Derived values
  const isAdmin = user?.role === 'ADMIN';
  const roleColor = isAdmin ? 'amber' : 'emerald';
  const roleLabel = isAdmin ? 'Администратор' : 'Аудитор';

  const initials = useMemo(() => (user?.name ? getInitials(user.name) : '?'), [user]);

  const stats: UserStats | null = useMemo(
    () => (user?.role ? generateMockStats(user.role) : null),
    [user],
  );

  // ── Preference handlers ──

  const handleToggleSounds = useCallback((checked: boolean) => {
    setPrefs((prev) => ({ ...prev, notificationSounds: checked }));
    toast.success(checked ? 'Звуки уведомлений включены' : 'Звуки уведомлений выключены');
  }, []);

  const handleToggleCompact = useCallback((checked: boolean) => {
    setPrefs((prev) => ({ ...prev, compactMode: checked }));
    toast.success(checked ? 'Компактный режим включён' : 'Стандартный режим включён');
  }, []);

  const handleLanguageChange = useCallback((value: string) => {
    setPrefs((prev) => ({ ...prev, language: value }));
    toast.success('Язык изменён на Русский');
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Вы вышли из системы');
  }, [logout]);

  // ── Guard ──
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Пользователь не авторизован</p>
      </div>
    );
  }

  // ── Gradient classes by role ──
  const headerGradient = isAdmin
    ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700'
    : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700';

  const accentBgClass = isAdmin ? 'bg-amber-50' : 'bg-emerald-50';
  const accentTextClass = isAdmin ? 'text-amber-600' : 'text-emerald-600';
  const accentBorderClass = isAdmin ? 'border-amber-200' : 'border-emerald-200';
  const accentBadgeClass = isAdmin
    ? 'bg-amber-100/90 text-amber-800 border-amber-200'
    : 'bg-emerald-100/90 text-emerald-800 border-emerald-200';
  const avatarRingClass = isAdmin
    ? 'ring-4 ring-amber-300/50'
    : 'ring-4 ring-emerald-300/50';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* ─── Profile Header Card ─── */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* Gradient banner */}
          <div className={`${headerGradient} relative px-6 pb-14 pt-6`}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-white/5" />

            {/* Role badge */}
            <div className="relative z-10">
              <Badge className={`${accentBadgeClass} border backdrop-blur-sm`}>
                <Shield className="w-3 h-3 mr-1" />
                {roleLabel}
              </Badge>
            </div>
          </div>

          {/* Profile info section — overlapping the gradient */}
          <CardContent className="relative px-6 -mt-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              {/* Large avatar with animated gradient border */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600"
              >
                <Avatar className="w-full h-full bg-white shadow-lg border-4 border-white">
                  <AvatarFallback
                  className={`text-2xl font-bold ${
                    isAdmin
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              </motion.div>

              <div className="text-center sm:text-left flex-1 pb-1">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 mt-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email}
                  </span>
                  {user.department && (
                    <>
                      <span className="hidden sm:inline text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {user.department}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status dot */}
              <div className="flex items-center gap-2 pb-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-sm text-muted-foreground">В сети</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Activity Stats ─── */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Audits Completed */}
          <Card className="glass card-hover-lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBgClass}`}>
                  <CheckCircle2 className={`w-5 h-5 ${accentTextClass}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold count-animate">{stats.auditsCompleted}</div>
              <p className="text-sm text-muted-foreground mt-0.5">Аудитов завершено</p>
            </CardContent>
          </Card>

          {/* Audits Pending */}
          <Card className="glass card-hover-lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Активные
                </Badge>
              </div>
              <div className="text-3xl font-bold count-animate">{stats.auditsPending}</div>
              <p className="text-sm text-muted-foreground mt-0.5">Аудитов в работе</p>
            </CardContent>
          </Card>

          {/* Member Since */}
          <Card className="glass card-hover-lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                <Award className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-lg font-bold leading-tight">
                {formatDate(stats.memberSince)}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Участник с</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Completion Progress ─── */}
      {stats && (
        <motion.div variants={itemVariants}>
          <Card className="glass card-hover-glow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                    <TrendingUp className={`w-4 h-4 ${accentTextClass}`} />
                  </div>
                  <span className="text-sm font-semibold">Общий прогресс аудитов</span>
                </div>
                <span className={`text-lg font-bold ${accentTextClass}`}>
                  {stats.completionRate}%
                </span>
              </div>
              <Progress value={stats.completionRate} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.auditsCompleted} из {stats.auditsCompleted + stats.auditsPending} аудитов выполнено
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Tabs: Settings / Info ─── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Информация</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── Settings Tab ─── */}
          <TabsContent value="settings">
            <Card className="glass mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${accentTextClass}`} />
                  Настройки уведомлений и отображения
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Sounds */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                      {prefs.notificationSounds ? (
                        <Volume2 className={`w-4 h-4 ${accentTextClass}`} />
                      ) : (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="notification-sounds" className="text-sm font-medium cursor-pointer">
                        Звуки уведомлений
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Воспроизводить звук при новых уведомлениях
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="notification-sounds"
                    checked={prefs.notificationSounds}
                    onCheckedChange={handleToggleSounds}
                  />
                </div>

                <Separator />

                {/* Compact Mode */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                      <LayoutGrid className={`w-4 h-4 ${accentTextClass}`} />
                    </div>
                    <div>
                      <Label htmlFor="compact-mode" className="text-sm font-medium cursor-pointer">
                        Компактный режим
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Уменьшить отступы для большей информативности
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={prefs.compactMode}
                    onCheckedChange={handleToggleCompact}
                  />
                </div>

                <Separator />

                {/* Language Selection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                      <User className={`w-4 h-4 ${accentTextClass}`} />
                    </div>
                    <div>
                      <Label htmlFor="language-select" className="text-sm font-medium">
                        Язык интерфейса
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Выберите язык отображения системы
                      </p>
                    </div>
                  </div>
                  <Select value={prefs.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language-select" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Info Tab ─── */}
          <TabsContent value="info">
            <Card className="glass mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className={`w-4 h-4 ${accentTextClass}`} />
                  Личная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                    <User className={`w-4 h-4 ${accentTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Имя</p>
                    <p className="text-sm font-medium truncate">{user.name}</p>
                  </div>
                  <Input
                    readOnly
                    value={user.name}
                    className="hidden max-w-[180px] h-8 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Электронная почта</p>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-50">
                    <Phone className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Телефон</p>
                    <p className="text-sm font-medium truncate">
                      {user.phone || 'Не указан'}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-teal-50">
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Подразделение</p>
                    <p className="text-sm font-medium truncate">
                      {user.department || 'Не указано'}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBgClass}`}>
                    <Shield className={`w-4 h-4 ${accentTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Роль</p>
                    <p className="text-sm font-medium">{roleLabel}</p>
                  </div>
                  <Badge className={accentBadgeClass} variant="outline">
                    {user.role}
                  </Badge>
                </div>

                {/* Member since (info tab) */}
                {stats && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-50">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Дата регистрации</p>
                      <p className="text-sm font-medium">{formatDate(stats.memberSince)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ─── Logout Button ─── */}
      <motion.div variants={itemVariants}>
        <Card className="glass border-red-200/50">
          <CardContent className="p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full h-11 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors gap-2"
            >
              <LogOut className="w-4 h-4" />
              Выйти из системы
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
