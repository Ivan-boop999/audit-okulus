'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Shield, User, Phone, Mail,
  Building2, MoreVertical, Pencil, Check, X, ChevronDown,
  UserCheck, UserX, AlertCircle, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────
interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  phone?: string | null;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assignedAudits: number;
    completedAudits: number;
    createdTemplates: number;
  };
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  department: string;
  role: string;
  isActive: boolean;
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  role: 'AUDITOR',
  isActive: true,
};

// ─── Role label helpers ─────────────────────────────────────────
const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  AUDITOR: 'Аудитор',
};

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  AUDITOR: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
};

// ─── Animation variants ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 20, stiffness: 120 },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

// ─── Initials avatar color ──────────────────────────────────────
const avatarColors = [
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Skeleton Loader ────────────────────────────────────────────
function MemberSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-36 shimmer rounded" />
          <div className="h-3 w-48 shimmer rounded" />
          <div className="h-3 w-28 shimmer rounded" />
        </div>
        <div className="w-20 h-6 shimmer rounded-full flex-shrink-0" />
      </div>
      <div className="mt-4 pt-3 border-t flex items-center gap-4">
        <div className="h-3 w-24 shimmer rounded" />
        <div className="h-3 w-20 shimmer rounded" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function TeamMembers() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (deptFilter !== 'all') params.set('department', deptFilter);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, deptFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  // ── Derived stats ──
  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      auditors: users.filter((u) => u.role === 'AUDITOR').length,
    }),
    [users]
  );

  // ── Unique departments ──
  const departments = useMemo(() => {
    const depts = new Set<string>();
    users.forEach((u) => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts).sort();
  }, [users]);

  // ── Form handling ──
  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ ...emptyForm, password: 'audit123' });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (user: TeamUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      department: user.department || '',
      role: user.role,
      isActive: user.isActive,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};
    if (!formData.name.trim()) errors.name = 'Имя обязательно';
    if (!formData.email.trim()) errors.email = 'Email обязателен';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Некорректный email';
    if (!editingUser && !formData.password.trim()) errors.password = 'Пароль обязателен для нового пользователя';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editingUser) {
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            department: formData.department || null,
            role: formData.role,
            isActive: formData.isActive,
          }),
        });
        if (res.ok) {
          toast.success(`Данные ${editingUser.name} обновлены`);
          setDialogOpen(false);
          fetchUsers();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Ошибка обновления');
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || null,
            department: formData.department || null,
            role: formData.role,
            isActive: formData.isActive,
          }),
        });
        if (res.ok) {
          toast.success(`Сотрудник ${formData.name} добавлен`);
          setDialogOpen(false);
          fetchUsers();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Ошибка создания');
        }
      }
    } catch {
      toast.error('Сетевая ошибка');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: TeamUser) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(user.isActive ? `${user.name} деактивирован` : `${user.name} активирован`);
        fetchUsers();
      }
    } catch {
      toast.error('Ошибка изменения статуса');
    }
  };

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = () => setActiveDropdown(null);
    if (activeDropdown) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeDropdown]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Команда</h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? 'сотрудник' : stats.total < 5 ? 'сотрудника' : 'сотрудников'} в команде
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 shadow-sm">
          <UserPlus className="w-4 h-4" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-hover-lift">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего сотрудников</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="card-hover-lift">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-lime-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {stats.active}
                </p>
                <p className="text-xs text-muted-foreground">Активных</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-hover-lift">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.auditors}</p>
                <p className="text-xs text-muted-foreground">Аудиторов</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card border-border/60"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-border/60 bg-card px-3 pr-8 text-sm appearance-none cursor-pointer hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Все роли</option>
              <option value="ADMIN">Администратор</option>
              <option value="AUDITOR">Аудитор</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-lg border border-border/60 bg-card px-3 pr-8 text-sm appearance-none cursor-pointer hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Все отделы</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Members Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MemberSkeleton key={i} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Сотрудники не найдены</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Попробуйте изменить фильтры или добавьте нового сотрудника
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {users.map((user) => (
              <motion.div
                key={user.id}
                variants={cardVariants}
                layout
                exit="exit"
                whileHover={{ y: -3 }}
                className="group"
              >
                <Card
                  className="card-hover-lift cursor-pointer overflow-hidden border-border/60 hover:border-primary/30 transition-colors"
                  onClick={() => openEditDialog(user)}
                >
                  <CardContent className="p-5">
                    {/* Top row: avatar + info + actions */}
                    <div className="flex items-start gap-3.5">
                      {/* Avatar with status dot */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(user.name)}`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                            user.isActive
                              ? 'bg-emerald-500 status-online'
                              : 'bg-gray-400 dark:bg-gray-600'
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </p>
                        {user.department && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            {user.department}
                          </p>
                        )}
                      </div>

                      {/* Role badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 flex-shrink-0 ${roleBadgeClass[user.role] || roleBadgeClass.AUDITOR}`}
                      >
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </div>

                    {/* Bottom row: stats + phone */}
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {user._count?.completedAudits || 0} аудитов
                        </span>
                      </div>

                      {/* Quick actions dropdown */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === user.id ? null : user.id);
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        <AnimatePresence>
                          {activeDropdown === user.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-1 w-40 bg-card rounded-lg border shadow-lg z-30 py-1"
                            >
                              <button
                                onClick={() => {
                                  openEditDialog(user);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Редактировать
                              </button>
                              <button
                                onClick={() => {
                                  toggleActive(user);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    Деактивировать
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Активировать
                                  </>
                                )}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Join date */}
                    <div className="mt-2 text-[10px] text-muted-foreground/70">
                      Добавлен {formatDate(user.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? (
                <>
                  <Pencil className="w-5 h-5 text-primary" />
                  Редактировать сотрудника
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-primary" />
                  Новый сотрудник
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Имя *
              </Label>
              <Input
                id="name"
                placeholder="Иванов Иван Иванович"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ivanov@factory.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Password (new only) */}
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Пароль *
                </Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="audit123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={formErrors.password ? 'border-destructive' : ''}
                />
                {formErrors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.password}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Пароль по умолчанию: audit123
                </p>
              </div>
            )}

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Телефон
              </Label>
              <Input
                id="phone"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="dept" className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Отдел
              </Label>
              <Input
                id="dept"
                placeholder="Производство"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            {/* Role select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Роль
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'AUDITOR' })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                    formData.role === 'AUDITOR'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-600'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Аудитор
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                    formData.role === 'ADMIN'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-600'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Администратор
                </button>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {formData.isActive ? (
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <UserX className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {formData.isActive ? 'Активен' : 'Неактивен'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.isActive
                      ? 'Сотрудник имеет доступ к системе'
                      : 'Вход в систему запрещён'}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-1.5" />
                Отмена
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                {editingUser ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
