'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { Shield, User, Eye, EyeOff, Loader2, Factory, ChevronRight, FileText, ListChecks, BarChart3, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface LoginScreenProps {
  onLogin: () => void;
}

const demoAccounts = [
  { role: 'ADMIN', email: 'admin@factory.com', password: 'admin123', name: 'Алексей Петров', department: 'Управление качеством' },
  { role: 'AUDITOR', email: 'ivanov@factory.com', password: 'auditor123', name: 'Сергей Иванов', department: 'Цех №1' },
  { role: 'AUDITOR', email: 'smirnova@factory.com', password: 'auditor123', name: 'Елена Смирнова', department: 'Цех №2' },
  { role: 'AUDITOR', email: 'kozlov@factory.com', password: 'auditor123', name: 'Дмитрий Козлов', department: 'Склад' },
];

// ─── Floating Particle ─────────────────────────────────────────────────────────

function FloatingParticle({ delay, x, y, size, duration }: { delay: number; x: number; y: number; size: number; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/10"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        opacity: [0.1, 0.4, 0.1],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Decorative Grid Lines ─────────────────────────────────────────────────────

function GridPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

// ─── Login Screen ───────────────────────────────────────────────────────────────

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Введите email и пароль');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка входа');
        return;
      }

      login(data.user);
      toast.success(`Добро пожаловать, ${data.user.name}!`);
      setTimeout(onLogin, 300);
    } catch {
      toast.error('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка входа');
        return;
      }

      login(data.user);
      toast.success(`Добро пожаловать, ${data.user.name}!`);
      setTimeout(onLogin, 300);
    } catch {
      toast.error('Ошибка подключения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-emerald-950"
      >
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full bg-emerald-600/30 blur-[100px]"
            animate={{
              x: [0, 60, -30, 0],
              y: [0, -40, 50, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] rounded-full bg-teal-500/25 blur-[100px]"
            animate={{
              x: [0, -50, 40, 0],
              y: [0, 30, -60, 0],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 left-1/2 w-[50%] h-[50%] rounded-full bg-emerald-400/15 blur-[80px]"
            animate={{
              x: [0, -70, 30, 0],
              y: [0, 50, -30, 0],
              scale: [1, 1.2, 0.85, 1],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/3 w-[40%] h-[40%] rounded-full bg-teal-600/20 blur-[80px]"
            animate={{
              x: [0, 40, -50, 0],
              y: [0, -60, 20, 0],
              scale: [0.9, 1.15, 1, 0.9],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Grid Pattern */}
        <GridPattern />

        {/* Floating Particles */}
        {[
          { delay: 0, x: 10, y: 20, size: 8, duration: 6 },
          { delay: 1, x: 25, y: 60, size: 12, duration: 8 },
          { delay: 0.5, x: 50, y: 30, size: 6, duration: 5 },
          { delay: 2, x: 70, y: 70, size: 10, duration: 7 },
          { delay: 1.5, x: 85, y: 15, size: 8, duration: 9 },
          { delay: 3, x: 40, y: 85, size: 14, duration: 6 },
          { delay: 0.8, x: 60, y: 45, size: 5, duration: 7 },
          { delay: 2.5, x: 15, y: 80, size: 9, duration: 8 },
          { delay: 1.2, x: 90, y: 50, size: 7, duration: 5 },
          { delay: 3.5, x: 35, y: 10, size: 11, duration: 10 },
        ].map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}

        <div className="absolute inset-0 bg-black/20" />

        {/* Decorative shapes */}
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full border border-white/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg shadow-black/20">
                <Factory className="w-8 h-8" />
              </div>
              <span className="text-3xl font-bold tracking-tight">AuditPro</span>
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Управление аудитами
              <br />
              <span className="text-emerald-200">нового поколения</span>
            </h1>
            <p className="text-xl text-white/80 leading-relaxed max-w-md">
              Комплексная платформа для контроля качества, безопасности и эффективности производственных процессов
            </p>
            <div className="mt-12 flex gap-8">
              {[
                { label: 'Аудитов проведено', value: '2,847' },
                { label: 'Оборудования', value: '156' },
                { label: 'Аудиторов', value: '24' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature pills */}
            <div className="mt-10 flex flex-wrap gap-2.5">
              {[
                { label: 'Шаблоны аудитов', icon: FileText },
                { label: 'Планы действий', icon: ListChecks },
                { label: 'Аналитика', icon: BarChart3 },
                { label: 'Уведомления', icon: Bell },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + i * 0.15, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.05 }}
                    className="group relative"
                  >
                    {/* Gradient border glow */}
                    <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-400/30 to-emerald-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] group-hover:border-white/[0.25] text-sm text-white/90 group-hover:text-white transition-all duration-300">
                      <Icon className="w-3.5 h-3.5 text-emerald-300/80 group-hover:text-emerald-200 transition-colors" />
                      {feature.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right panel - Login form */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-background to-muted/30 relative overflow-hidden"
      >
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-teal-500/5 blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Factory className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">AuditPro</span>
          </div>

          {/* Gradient top border card wrapper */}
          <div className="relative">
            <div className="absolute -top-[2px] left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-80" />
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-2">Вход в систему</h2>
            <p className="text-muted-foreground mb-8">Войдите, чтобы продолжить работу</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-5">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-2"
            >
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@factory.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 bg-background/80 focus-visible:ring-emerald-500/30 transition-all"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="space-y-2"
            >
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 bg-background/80 focus-visible:ring-emerald-500/30 transition-all"
                />
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </Button>
            </motion.div>
          </form>

          {/* Demo accounts */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">Быстрый вход (демо)</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {demoAccounts.map((account, i) => (
                  <motion.div
                    key={account.email}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.1, duration: 0.3 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-200 group card-hover-lift overflow-hidden relative ${
                        account.role === 'ADMIN'
                          ? 'hover:border-amber-400/50 hover:shadow-md hover:shadow-amber-500/10'
                          : 'hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/10'
                      }`}
                      onClick={() => handleDemoLogin(account)}
                    >
                      {/* Left color indicator bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        account.role === 'ADMIN' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />

                      {/* Admin shimmer/glow */}
                      {account.role === 'ADMIN' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.03] via-amber-400/[0.06] to-amber-500/[0.03]"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}

                      <CardContent className="p-3 flex items-center justify-between pl-4">
                        <div className="flex items-center gap-3 relative z-10">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            account.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}>
                            {account.role === 'ADMIN' ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{account.name}</div>
                            <div className="text-xs text-muted-foreground">{account.department}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 relative z-10">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            account.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}>
                            {account.role === 'ADMIN' ? 'Администратор' : 'Аудитор'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Bottom branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-muted-foreground">
              AuditPro v2.1 &middot; Система управления аудитами
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
