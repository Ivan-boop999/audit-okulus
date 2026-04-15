'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, CalendarDays, Filter, X,
  ArrowUpDown, CheckCircle2, Clock, AlertTriangle, XCircle,
  PlayCircle, LayoutGrid, List, MoreHorizontal, Users,
  ClipboardList, CalendarClock, Sparkles, Layers, Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogFooter, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import AutoAssignDialog from './auto-assign-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Auditor {
  id: string;
  name: string;
  email: string;
  department?: string | null;
}

interface Template {
  id: string;
  title: string;
  category: string;
  status: string;
  frequency?: string | null;
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
}

interface AssignmentFormData {
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: AssignmentFormData = {
  templateId: '',
  auditorId: '',
  scheduledDate: '',
  dueDate: '',
  notes: '',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; dotColor: string; borderColor: string; gradientBg: string; countColor: string }> = {
  SCHEDULED: {
    label: 'Запланирован',
    color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    icon: CalendarClock,
    dotColor: 'bg-sky-500',
    borderColor: 'border-l-sky-400',
    gradientBg: 'bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20',
    countColor: 'text-sky-600 dark:text-sky-400',
  },
  IN_PROGRESS: {
    label: 'В процессе',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: PlayCircle,
    dotColor: 'bg-amber-500',
    borderColor: 'border-l-amber-400',
    gradientBg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
    countColor: 'text-amber-600 dark:text-amber-400',
  },
  COMPLETED: {
    label: 'Завершён',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    borderColor: 'border-l-emerald-400',
    gradientBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
    countColor: 'text-emerald-600 dark:text-emerald-400',
  },
  OVERDUE: {
    label: 'Просрочен',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    icon: AlertTriangle,
    dotColor: 'bg-red-500',
    borderColor: 'border-l-red-400',
    gradientBg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20',
    countColor: 'text-red-600 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Отменён',
    color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
    icon: XCircle,
    dotColor: 'bg-slate-400',
    borderColor: 'border-l-slate-300 dark:border-l-slate-600',
    gradientBg: 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
    countColor: 'text-slate-500 dark:text-slate-400',
  },
};

const statusOptions = [
  { value: 'SCHEDULED', label: 'Запланирован', dot: 'bg-sky-500' },
  { value: 'IN_PROGRESS', label: 'В процессе', dot: 'bg-amber-500' },
  { value: 'COMPLETED', label: 'Завершён', dot: 'bg-emerald-500' },
  { value: 'OVERDUE', label: 'Просрочен', dot: 'bg-red-500' },
  { value: 'CANCELLED', label: 'Отменён', dot: 'bg-slate-400' },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.2 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditScheduler() {
  // Data state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAuditor, setFilterAuditor] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortField, setSortField] = useState<'scheduledDate' | 'status' | 'template' | 'auditor'>('scheduledDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Auto-assign dialog state
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Assignment | null>(null);
  const [statusChangingItem, setStatusChangingItem] = useState<Assignment | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [formData, setFormData] = useState<AssignmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assignments');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssignments(data);
    } catch {
      toast.error('Не удалось загрузить назначения');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error('Не удалось загрузить шаблоны');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAssignments(), fetchTemplates()]);
  }, [fetchAssignments, fetchTemplates]);

  // ─── Derived Data ────────────────────────────────────────────────────────

  // Extract unique auditors from assignments
  const auditors = useMemo(() => {
    const map = new Map<string, Auditor>();
    assignments.forEach((a) => {
      if (a.auditor && !map.has(a.auditorId)) {
        map.set(a.auditorId, a.auditor);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  // Active templates for the form dropdown
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.status === 'ACTIVE'),
    [templates],
  );

  // Filter & sort assignments
  const filteredAssignments = useMemo(() => {
    let items = [...assignments];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.template?.title?.toLowerCase().includes(q) ||
          a.auditor?.name?.toLowerCase().includes(q) ||
          a.auditor?.department?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      items = items.filter((a) => a.status === filterStatus);
    }

    // Auditor filter
    if (filterAuditor !== 'all') {
      items = items.filter((a) => a.auditorId === filterAuditor);
    }

    // Date range filter
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      items = items.filter((a) => new Date(a.scheduledDate) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      items = items.filter((a) => new Date(a.scheduledDate) <= to);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'scheduledDate') cmp = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'template') cmp = (a.template?.title || '').localeCompare(b.template?.title || '');
      else if (sortField === 'auditor') cmp = (a.auditor?.name || '').localeCompare(b.auditor?.name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [assignments, searchQuery, filterStatus, filterAuditor, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Status counts
  const statusCounts = useMemo(
    () => ({
      SCHEDULED: assignments.filter((a) => a.status === 'SCHEDULED').length,
      IN_PROGRESS: assignments.filter((a) => a.status === 'IN_PROGRESS').length,
      COMPLETED: assignments.filter((a) => a.status === 'COMPLETED').length,
      OVERDUE: assignments.filter((a) => a.status === 'OVERDUE').length,
      CANCELLED: assignments.filter((a) => a.status === 'CANCELLED').length,
    }),
    [assignments],
  );

  const hasActiveFilters = filterStatus !== 'all' || filterAuditor !== 'all' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterAuditor('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: Assignment) => {
    setEditingId(item.id);
    setFormData({
      templateId: item.templateId,
      auditorId: item.auditorId,
      scheduledDate: item.scheduledDate ? item.scheduledDate.split('T')[0] : '',
      dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
      notes: item.notes || '',
    });
    setFormOpen(true);
  };

  const openDelete = (item: Assignment) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const openStatusChange = (item: Assignment) => {
    setStatusChangingItem(item);
    setNewStatus(item.status);
    setStatusDialogOpen(true);
  };

  const handleFormChange = (field: keyof AssignmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.templateId) { toast.error('Выберите шаблон аудита'); return; }
    if (!formData.auditorId) { toast.error('Выберите аудитора'); return; }
    if (!formData.scheduledDate) { toast.error('Укажите плановую дату'); return; }

    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { id: editingId, ...formData }
        : formData;

      const res = await fetch('/api/assignments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Request failed');

      toast.success(editingId ? 'Назначение обновлено' : 'Аудит назначен');
      setFormOpen(false);
      fetchAssignments();
    } catch {
      toast.error(editingId ? 'Не удалось обновить назначение' : 'Не удалось создать назначение');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/assignments?id=${deletingItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Назначение удалено');
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchAssignments();
    } catch {
      toast.error('Не удалось удалить назначение');
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangingItem || !newStatus) return;
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: statusChangingItem.id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const cfg = statusConfig[newStatus];
      toast.success(`Статус изменён: ${cfg?.label || newStatus}`);
      setStatusDialogOpen(false);
      setStatusChangingItem(null);
      fetchAssignments();
    } catch {
      toast.error('Не удалось изменить статус');
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const totalAssignments = assignments.length;

  return (
    <div className="space-y-6">
      {/* ─── Gradient Header Section ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-6 sm:p-8 text-white"
      >
        {/* Decorative blurred circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-emerald-300/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Расписание аудитов</h1>
            </div>
            <p className="text-emerald-100/80 text-sm sm:text-base">
              Управление назначениями и расписанием проверок
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={() => setAutoAssignOpen(true)} className="gap-2 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/20 shadow-lg font-semibold">
                <Wand2 className="w-4 h-4" />
                Автоназначение
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={openCreate} className="gap-2 bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg border-0 font-semibold">
                <Plus className="w-4 h-4" />
                Назначить аудит
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Summary Bar ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none"
      >
        <div className="flex items-center gap-2 bg-muted/60 dark:bg-muted/30 rounded-xl px-4 py-2.5 border flex-shrink-0">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Всего</span>
          <span className="text-sm font-bold">{totalAssignments}</span>
        </div>
        {[
          { key: 'SCHEDULED' as const, icon: CalendarClock, color: 'text-sky-500' },
          { key: 'IN_PROGRESS' as const, icon: PlayCircle, color: 'text-amber-500' },
          { key: 'COMPLETED' as const, icon: CheckCircle2, color: 'text-emerald-500' },
          { key: 'OVERDUE' as const, icon: AlertTriangle, color: 'text-red-500' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilterStatus(filterStatus === stat.key ? 'all' : stat.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border transition-all duration-200 flex-shrink-0 cursor-pointer ${
              filterStatus === stat.key
                ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                : 'bg-muted/60 dark:bg-muted/30 hover:bg-muted dark:hover:bg-muted/50'
            }`}
          >
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{statusConfig[stat.key].label}</span>
            <span className={`text-sm font-bold ${filterStatus === stat.key ? 'text-foreground' : stat.color}`}>
              {statusCounts[stat.key]}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Search, Filters, View Toggle */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по шаблону, аудитору, заметкам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex border rounded-lg overflow-hidden flex-shrink-0">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none h-10 px-3"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none h-10 px-3"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[180px] h-10">
                  <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Auditor Filter */}
              <Select value={filterAuditor} onValueChange={setFilterAuditor}>
                <SelectTrigger className="w-full lg:w-[220px] h-10">
                  <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Аудитор" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все аудиторы</SelectItem>
                  {auditors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                          {getInitials(a.name)}
                        </span>
                        <span className="truncate">{a.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full lg:w-[170px] h-10"
                placeholder="С даты"
              />

              {/* Date To */}
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full lg:w-[170px] h-10"
                placeholder="По дату"
              />

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="w-4 h-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : ''}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="shimmer h-4 w-3/4 rounded mb-3" />
                <div className="shimmer h-3 w-1/2 rounded mb-2" />
                <div className="shimmer h-3 w-2/3 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="shimmer h-6 w-20 rounded-full" />
                  <div className="shimmer h-6 w-24 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        /* ─── Enhanced Empty State ───────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-dashed bg-gradient-to-b from-muted/40 to-muted/10 dark:from-muted/20 dark:to-muted/5"
        >
          <div className="flex flex-col items-center justify-center py-20 px-6">
            {/* Floating animated icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center shadow-lg">
                <CalendarDays className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
                className="absolute -inset-2 rounded-3xl bg-emerald-400/20 blur-md -z-10"
              />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Назначения не найдены</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {hasActiveFilters || searchQuery
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Создайте первое назначение, чтобы начать управление расписанием аудитов'}
            </p>
            {!hasActiveFilters && !searchQuery && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-6">
                <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20">
                  <Plus className="w-4 h-4" />
                  Назначить аудит
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : viewMode === 'grid' ? (
        /* ─── Grid View ─────────────────────────────────────────────────── */
        <motion.div
          key="grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredAssignments.map((item) => {
              const statusCfg = statusConfig[item.status] || statusConfig.SCHEDULED;
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                >
                  <Card className={`group overflow-hidden transition-all duration-300 border border-l-4 ${statusCfg.borderColor} hover:shadow-lg hover:-translate-y-0.5 dark:shadow-none h-full flex flex-col`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${statusCfg.color} flex-shrink-0`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold leading-tight truncate">
                              {item.template?.title || 'Шаблон'}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {item.template?.category}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => openDelete(item)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        {/* Auditor */}
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {getInitials(item.auditor?.name || '??')}
                          </div>
                          <span className="font-medium truncate">{item.auditor?.name || 'Не назначен'}</span>
                          {item.auditor?.department && (
                            <span className="text-xs text-muted-foreground truncate">· {item.auditor.department}</span>
                          )}
                        </div>
                        {/* Dates */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>План: {formatDate(item.scheduledDate)}</span>
                          </div>
                        </div>
                        {item.dueDate && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Срок: {formatDate(item.dueDate)}</span>
                            </div>
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/50 rounded px-2 py-1.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge variant="outline" className={`text-[11px] gap-1 ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => openStatusChange(item)}
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          Статус
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* ─── Table View ────────────────────────────────────────────────── */
        <motion.div
          key="table"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <button
                      onClick={() => toggleSort('template')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Шаблон
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('auditor')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Аудитор
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button
                      onClick={() => toggleSort('scheduledDate')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Плановая дата
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Срок</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Статус
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredAssignments.map((item) => {
                    const statusCfg = statusConfig[item.status] || statusConfig.SCHEDULED;
                    const TableStatusIcon = statusCfg.icon;

                    return (
                      <motion.tr
                        key={item.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className={`group border-b transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-default ${statusCfg.borderColor}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                              item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                              item.status === 'OVERDUE' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                              item.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                              item.status === 'CANCELLED' ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700' :
                              'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800'
                            }`}>
                              <ClipboardList className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{item.template?.title || 'Шаблон'}</div>
                              <div className="text-xs text-muted-foreground truncate">{item.template?.category}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {getInitials(item.auditor?.name || '??')}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{item.auditor?.name || 'Не назначен'}</div>
                              <div className="text-xs text-muted-foreground truncate">{item.auditor?.department || ''}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                            {formatDate(item.scheduledDate)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(item.dueDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => openStatusChange(item)}
                            className="cursor-pointer"
                          >
                            <Badge variant="outline" className={`text-[11px] gap-1 transition-colors hover:opacity-80 ${statusCfg.color}`}>
                              <TableStatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                              title="Редактировать"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => openDelete(item)}
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {/* Results Count */}
      {!loading && filteredAssignments.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          Показано {filteredAssignments.length} из {assignments.length} назначений
        </div>
      )}

      {/* ─── Create / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Редактировать назначение
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Назначить аудит
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Измените параметры назначения и сохраните'
                : 'Выберите шаблон и аудитора для назначения проверки'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Template Selector */}
            <div className="grid gap-2">
              <Label htmlFor="as-template">
                Шаблон аудита <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.templateId}
                onValueChange={(v) => handleFormChange('templateId', v)}
              >
                <SelectTrigger id="as-template" className="w-full">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      <span className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{tpl.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">({tpl.category})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Нет активных шаблонов. Сначала создайте шаблон аудита.
                </p>
              )}
            </div>

            {/* Auditor Selector */}
            <div className="grid gap-2">
              <Label htmlFor="as-auditor">
                Аудитор <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.auditorId}
                onValueChange={(v) => handleFormChange('auditorId', v)}
              >
                <SelectTrigger id="as-auditor" className="w-full">
                  <SelectValue placeholder="Выберите аудитора" />
                </SelectTrigger>
                <SelectContent>
                  {auditors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {getInitials(a.name)}
                        </span>
                        <span className="truncate">{a.name}</span>
                        {a.department && (
                          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">({a.department})</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {auditors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Нет доступных аудиторов. Назначьте аудит после создания пользователей-аудиторов.
                </p>
              )}
            </div>

            {/* Scheduled Date & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="as-scheduled-date">
                  Плановая дата <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="as-scheduled-date"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="as-due-date">
                  Срок выполнения
                </Label>
                <Input
                  id="as-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleFormChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="as-notes">Заметки</Label>
              <Textarea
                id="as-notes"
                placeholder="Дополнительные комментарии или инструкции..."
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : editingId ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Сохранить
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Назначить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Auto-Assign Dialog ────────────────────────────────────────── */}
      <AutoAssignDialog
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        onCreated={fetchAssignments}
      />

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Удалить назначение?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Вы уверены, что хотите удалить назначение{' '}
                  <span className="font-semibold text-foreground">
                    &laquo;{deletingItem?.template?.title}&raquo;
                  </span>{' '}
                  для аудитора{' '}
                  <span className="font-semibold text-foreground">
                    {deletingItem?.auditor?.name}
                  </span>
                  ?
                </p>
                {deletingItem && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Плановая дата:</span>
                      <span>{formatDate(deletingItem.scheduledDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Срок:</span>
                      <span>{formatDate(deletingItem.dueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Статус:</span>
                      <span>{statusConfig[deletingItem.status]?.label || deletingItem.status}</span>
                    </div>
                  </div>
                )}
                <p className="text-red-500 font-medium text-xs">
                  Это действие нельзя отменить. Связанные ответы будут удалены.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Status Change Dialog ────────────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-emerald-600" />
              Изменить статус
            </DialogTitle>
            <DialogDescription>
              {statusChangingItem && (
                <>
                  Для назначения{' '}
                  <span className="font-semibold text-foreground">
                    &laquo;{statusChangingItem.template?.title}&raquo;
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current status */}
            {statusChangingItem && (
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">Текущий статус:</div>
                <Badge variant="outline" className={`text-[11px] gap-1.5 ${
                  statusConfig[statusChangingItem.status]?.color
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    statusConfig[statusChangingItem.status]?.dotColor
                  }`} />
                  {statusConfig[statusChangingItem.status]?.label || statusChangingItem.status}
                </Badge>
              </div>
            )}

            {/* New status selector */}
            <div className="grid gap-2">
              <Label>Новый статус</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={submitting || newStatus === statusChangingItem?.status}
            >
              Отмена
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={submitting || newStatus === statusChangingItem?.status}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Применить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
