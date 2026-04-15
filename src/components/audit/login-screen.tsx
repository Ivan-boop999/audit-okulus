'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { Shield, User, Eye, EyeOff, Loader2, Factory, ChevronRight } from 'lucide-react';
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

  const handleDemoLogin = (account: typeof demoAccounts[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    // Auto-submit after a short delay
    setTimeout(async () => {
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
    }, 100);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
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
          </motion.div>

          {/* Decorative circles */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute bottom-1/4 right-16 w-32 h-32 rounded-full bg-white/5" />
        </div>
      </motion.div>

      {/* Right panel - Login form */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-background to-muted/30"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Factory className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">AuditPro</span>
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
                  className="h-12 pl-10 bg-background/80"
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
                  className="h-12 pl-10 pr-10 bg-background/80"
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
              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
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
                      className="cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-sm group"
                      onClick={() => handleDemoLogin(account)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            account.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
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
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            account.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
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
        </div>
      </motion.div>
    </div>
  );
}
