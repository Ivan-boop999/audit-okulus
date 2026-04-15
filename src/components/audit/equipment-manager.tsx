'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Wrench, Cpu, BriefcaseConveyorBelt,
  Thermometer, Gauge, Zap, Factory, MapPin, X, Filter,
  MoreHorizontal, ArrowUpDown, Eye, EyeOff, LayoutGrid, List,
  ChevronDown, AlertTriangle, CheckCircle2, Clock, Package
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Equipment {
  id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EquipmentFormData {
  name: string;
  code: string;
  category: string;
  location: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: EquipmentFormData = {
  name: '',
  code: '',
  category: '',
  location: '',
  description: '',
  status: 'ACTIVE',
};

const EQUIPMENT_CATEGORIES = [
  'Пресс',
  'Станок ЧПУ',
  'Конвейер',
  'Термопластавтомат',
  'Измерительный прибор',
  'Генератор',
  'Сварочный аппарат',
  'Компрессор',
  'Насос',
  'Вентиляция',
  'Другое',
];

const categoryIcons: Record<string, React.ElementType> = {
  'Пресс': Wrench,
  'Станок ЧПУ': Cpu,
  'Конвейер': BriefcaseConveyorBelt,
  'Термопластавтомат': Thermometer,
  'Измерительный прибор': Gauge,
  'Генератор': Zap,
  'Сварочный аппарат': Factory,
  'Компрессор': Gauge,
  'Насос': Factory,
  'Вентиляция': Factory,
  'Другое': Package,
};

const categoryColors: Record<string, string> = {
  'Пресс': 'bg-blue-50 text-blue-700 border-blue-200',
  'Станок ЧПУ': 'bg-violet-50 text-violet-700 border-violet-200',
  'Конвейер': 'bg-amber-50 text-amber-700 border-amber-200',
  'Термопластавтомат': 'bg-red-50 text-red-700 border-red-200',
  'Измерительный прибор': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Генератор': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Сварочный аппарат': 'bg-orange-50 text-orange-700 border-orange-200',
  'Компрессор': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Насос': 'bg-teal-50 text-teal-700 border-teal-200',
  'Вентиляция': 'bg-sky-50 text-sky-700 border-sky-200',
  'Другое': 'bg-slate-50 text-slate-700 border-slate-200',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; dotColor: string }> = {
  ACTIVE: {
    label: 'Активно',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Неактивно',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: EyeOff,
    dotColor: 'bg-slate-400',
  },
  MAINTENANCE: {
    label: 'Обслуживание',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Wrench,
    dotColor: 'bg-amber-500',
  },
};

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

// ─── Component ────────────────────────────────────────────────────────────────

interface EquipmentManagerProps {
  onViewDetail?: (equipmentId: string) => void;
}

export default function EquipmentManager({ onViewDetail }: EquipmentManagerProps) {
  // Data state
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'code' | 'status' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/equipment');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEquipment(data);
    } catch {
      toast.error('Не удалось загрузить оборудование');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  // ─── Derived / Filtered / Sorted ─────────────────────────────────────────

  const filteredEquipment = useMemo(() => {
    let items = [...equipment];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      items = items.filter((e) => e.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      items = items.filter((e) => e.status === filterStatus);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'code') cmp = a.code.localeCompare(b.code);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [equipment, searchQuery, filterCategory, filterStatus, sortField, sortDir]);

  // Extract unique categories from data for the filter dropdown
  const uniqueCategories = useMemo(
    () => [...new Set(equipment.map((e) => e.category))].sort(),
    [equipment],
  );

  const statusCounts = useMemo(
    () => ({
      ACTIVE: equipment.filter((e) => e.status === 'ACTIVE').length,
      INACTIVE: equipment.filter((e) => e.status === 'INACTIVE').length,
      MAINTENANCE: equipment.filter((e) => e.status === 'MAINTENANCE').length,
    }),
    [equipment],
  );

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      code: item.code,
      category: item.category,
      location: item.location,
      description: item.description || '',
      status: item.status,
    });
    setFormOpen(true);
  };

  const openDelete = (item: Equipment) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleFormChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.name.trim()) { toast.error('Введите название оборудования'); return; }
    if (!formData.code.trim()) { toast.error('Введите код оборудования'); return; }
    if (!formData.category) { toast.error('Выберите категорию'); return; }
    if (!formData.location.trim()) { toast.error('Введите расположение'); return; }

    setSubmitting(true);
    try {
      const url = editingId
        ? '/api/equipment'
        : '/api/equipment';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Request failed');

      toast.success(editingId ? 'Оборудование обновлено' : 'Оборудование добавлено');
      setFormOpen(false);
      fetchEquipment();
    } catch {
      toast.error(editingId ? 'Не удалось обновить оборудование' : 'Не удалось добавить оборудование');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/equipment?id=${deletingItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Оборудование удалено');
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchEquipment();
    } catch {
      toast.error('Не удалось удалить оборудование');
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getCategoryIcon = (category: string) => categoryIcons[category] || Package;
  const getCategoryColor = (category: string) => categoryColors[category] || categoryColors['Другое'];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Оборудование</h1>
          <p className="text-muted-foreground mt-1">
            Управление парком производственного оборудования
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <Plus className="w-4 h-4" />
          Добавить оборудование
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { key: 'ACTIVE', label: 'Активно', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { key: 'MAINTENANCE', label: 'Обслуживание', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { key: 'INACTIVE', label: 'Неактивно', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
        ] as const).map((s) => {
          const cfg = statusConfig[s.key];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={s.key}
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`border ${s.border}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{statusCounts[s.key as keyof typeof statusCounts]}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search, Filters, View Toggle */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, коду, расположению..."
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

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-[180px] h-10">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-[180px] h-10">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="ACTIVE">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Активно
                  </span>
                </SelectItem>
                <SelectItem value="MAINTENANCE">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Обслуживание
                  </span>
                </SelectItem>
                <SelectItem value="INACTIVE">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Неактивно
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-10 px-3"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-10 px-3"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : ''}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="shimmer h-4 w-3/4 rounded mb-3" />
                <div className="shimmer h-3 w-1/2 rounded mb-2" />
                <div className="shimmer h-3 w-2/3 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEquipment.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground">Оборудование не найдено</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Попробуйте изменить параметры поиска или фильтры'
              : 'Нажмите кнопку выше, чтобы добавить первое оборудование'}
          </p>
          {!searchQuery && filterCategory === 'all' && filterStatus === 'all' && (
            <Button onClick={openCreate} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" />
              Добавить оборудование
            </Button>
          )}
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
            {filteredEquipment.map((item) => {
              const CatIcon = getCategoryIcon(item.category);
              const catColor = getCategoryColor(item.category);
              const statusCfg = statusConfig[item.status] || statusConfig.ACTIVE;
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                >
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border hover:border-emerald-200 dark:hover:border-emerald-800 h-full flex flex-col cursor-pointer" onClick={() => onViewDetail?.(item.id)}>
                    {/* Category color strip */}
                    <div className={`h-1 ${
                      item.status === 'ACTIVE' ? 'bg-emerald-500' :
                      item.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${catColor}`}>
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold leading-tight truncate">
                              {item.name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              {item.code}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); onViewDetail?.(item.id); }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); openDelete(item); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge variant="outline" className={`text-[11px] ${catColor}`}>
                          {item.category}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] gap-1.5 ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.label}
                        </Badge>
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
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Название
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('code')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Код
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Категория</TableHead>
                  <TableHead className="hidden lg:table-cell">Расположение</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-emerald-600 transition-colors"
                    >
                      Статус
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredEquipment.map((item) => {
                    const CatIcon = getCategoryIcon(item.category);
                    const catColor = getCategoryColor(item.category);
                    const statusCfg = statusConfig[item.status] || statusConfig.ACTIVE;

                    return (
                      <motion.tr
                        key={item.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className={`group border-b transition-colors hover:bg-muted/50 ${onViewDetail ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => onViewDetail?.(item.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${catColor}`}>
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px] hidden xl:block">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{item.code}</code>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={`text-[11px] ${catColor}`}>
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] gap-1.5 ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); onViewDetail?.(item.id); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); openDelete(item); }}
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
      {!loading && filteredEquipment.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          Показано {filteredEquipment.length} из {equipment.length} записей
        </div>
      )}

      {/* ─── Create / Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Редактировать оборудование
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Добавить оборудование
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Измените данные оборудования и сохраните'
                : 'Заполните информацию о новом оборудовании'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="eq-name">
                Название <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eq-name"
                placeholder="Например: Гидравлический пресс ПГ-100"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </div>

            {/* Code */}
            <div className="grid gap-2">
              <Label htmlFor="eq-code">
                Код <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eq-code"
                placeholder="Например: PRS-001"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value)}
                className="font-mono"
              />
            </div>

            {/* Category & Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Категория <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => handleFormChange('category', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((cat) => {
                      const Icon = getCategoryIcon(cat);
                      return (
                        <SelectItem key={cat} value={cat}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {cat}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleFormChange('status', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Активно
                      </span>
                    </SelectItem>
                    <SelectItem value="MAINTENANCE">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Обслуживание
                      </span>
                    </SelectItem>
                    <SelectItem value="INACTIVE">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Неактивно
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="eq-location">
                Расположение <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eq-location"
                placeholder="Например: Цех №1, Линия А"
                value={formData.location}
                onChange={(e) => handleFormChange('location', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="eq-description">Описание</Label>
              <Textarea
                id="eq-description"
                placeholder="Дополнительная информация об оборудовании..."
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
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
                  Создать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Удалить оборудование?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Вы уверены, что хотите удалить оборудование{' '}
                  <span className="font-semibold text-foreground">
                    &laquo;{deletingItem?.name}&raquo;
                  </span>
                  ?
                </p>
                {deletingItem && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Код:</span>
                      <span className="font-mono">{deletingItem.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Категория:</span>
                      <span>{deletingItem.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Расположение:</span>
                      <span>{deletingItem.location}</span>
                    </div>
                  </div>
                )}
                <p className="text-red-500 font-medium text-xs">
                  Это действие нельзя отменить. Связанные данные аудитов могут быть затронуты.
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
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
