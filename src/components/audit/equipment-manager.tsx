'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Wrench, Cpu, BriefcaseConveyorBelt,
  Thermometer, Gauge, Zap, Factory, MapPin, X, Filter,
  MoreHorizontal, ArrowUpDown, Eye, EyeOff, LayoutGrid, List,
  ChevronDown, AlertTriangle, CheckCircle2, Clock, Package,
  Download, Upload, FileText
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
import { Progress } from '@/components/ui/progress';
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
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500/0',
    icon: CheckCircle2,
    dotColor: 'bg-white',
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

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

const CSV_BOM = '\uFEFF';
const CSV_SEPARATOR = ';';

const STATUS_MAP_RU_TO_EN: Record<string, 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'> = {
  'Активно': 'ACTIVE',
  'На обслуживании': 'MAINTENANCE',
  'Неактивно': 'INACTIVE',
};

const COLUMN_ALIASES: Record<string, keyof EquipmentFormData> = {
  'Код': 'code',
  'Название': 'name',
  'Категория': 'category',
  'Местоположение': 'location',
  'Статус': 'status',
  'Описание': 'description',
  'code': 'code',
  'name': 'name',
  'category': 'category',
  'location': 'location',
  'status': 'status',
  'description': 'description',
};

function escapeCSVField(value: string): string {
  if (value.includes(CSV_SEPARATOR) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === CSV_SEPARATOR) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSVContent(text: string): string[][] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        currentLine += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines.map(parseCSVLine);
}

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

  // CSV Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<EquipmentFormData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    if (equipment.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const statusRuMap: Record<string, string> = {
      ACTIVE: 'Активно',
      MAINTENANCE: 'На обслуживании',
      INACTIVE: 'Неактивно',
    };

    const headers = ['Код', 'Название', 'Категория', 'Местоположение', 'Статус', 'Описание'];
    const rows = equipment.map((item) => [
      escapeCSVField(item.code),
      escapeCSVField(item.name),
      escapeCSVField(item.category),
      escapeCSVField(item.location),
      escapeCSVField(statusRuMap[item.status] || item.status),
      escapeCSVField(item.description || ''),
    ]);

    const csvContent = CSV_BOM + headers.join(CSV_SEPARATOR) + '\n' +
      rows.map((row) => row.join(CSV_SEPARATOR)).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `equipment_export_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Экспортировано ${equipment.length} записей`);
  }, [equipment]);

  // ─── CSV Template Download ──────────────────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    const headers = ['Код', 'Название', 'Категория', 'Местоположение', 'Статус', 'Описание'];
    const exampleRow = ['PRS-001', 'Гидравлический пресс ПГ-100', 'Пресс', 'Цех №1, Линия А', 'Активно', 'Описание оборудования'];
    const csvContent = CSV_BOM + headers.join(CSV_SEPARATOR) + '\n' + exampleRow.join(CSV_SEPARATOR);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Шаблон CSV загружен');
  }, []);

  // ─── CSV Import ──────────────────────────────────────────────────────────

  const resetImportState = useCallback(() => {
    setImportFile(null);
    setImportPreview([]);
    setImportHeaders([]);
    setImportRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportTotal(0);
    setImportErrors([]);
    setImportDone(false);
  }, []);

  const openImportDialog = useCallback(() => {
    resetImportState();
    setImportDialogOpen(true);
  }, [resetImportState]);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Выберите файл в формате .csv');
      return;
    }

    setImportFile(file);
    setImportDone(false);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVContent(text);

      if (rows.length < 2) {
        toast.error('Файл пуст или не содержит данных');
        return;
      }

      const headers = rows[0];
      setImportHeaders(headers);

      // Auto-detect column mapping
      const mapping: Record<number, keyof EquipmentFormData> = {};
      headers.forEach((h, idx) => {
        const mapped = COLUMN_ALIASES[h];
        if (mapped) mapping[idx] = mapped;
      });

      // Parse all data rows
      const parsedRows: EquipmentFormData[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.every((cell) => !cell)) continue; // skip empty rows

        const formDataRow: EquipmentFormData = { ...emptyForm };
        let hasData = false;

        Object.entries(mapping).forEach(([colIdx, field]) => {
          const value = row[parseInt(colIdx)] || '';
          if (value) {
            hasData = true;
            if (field === 'status') {
              const mappedStatus = STATUS_MAP_RU_TO_EN[value] || (
                ['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(value) ? value as 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' : 'ACTIVE'
              );
              formDataRow[field] = mappedStatus;
            } else {
              formDataRow[field] = value;
            }
          }
        });

        if (hasData) {
          if (!formDataRow.name || !formDataRow.code) {
            errors.push(`Строка ${i + 1}: отсутствует название или код`);
          } else {
            parsedRows.push(formDataRow);
          }
        }
      }

      if (parsedRows.length === 0) {
        toast.error('Не удалось найти валидные данные для импорта');
        return;
      }

      setImportRows(parsedRows);
      setImportErrors(errors);
      setImportPreview(rows.slice(0, 6)); // header + 5 data rows
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('border-emerald-400', 'bg-emerald-50/50', 'dark:bg-emerald-950/20');
    dropZoneRef.current?.classList.remove('border-dashed', 'border-muted-foreground/25');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-emerald-400', 'bg-emerald-50/50', 'dark:bg-emerald-950/20');
    dropZoneRef.current?.classList.add('border-dashed', 'border-muted-foreground/25');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-emerald-400', 'bg-emerald-50/50', 'dark:bg-emerald-950/20');
    dropZoneRef.current?.classList.add('border-dashed', 'border-muted-foreground/25');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = useCallback(async () => {
    if (importRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    setImportTotal(importRows.length);
    setImportErrors([]);

    let successCount = 0;
    let errorCount = 0;
    const newErrors: string[] = [];

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      try {
        const res = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          newErrors.push(`Строка ${i + 1}: ошибка создания «${row.name}»`);
        }
      } catch {
        errorCount++;
        newErrors.push(`Строка ${i + 1}: ошибка сети при создании «${row.name}»`);
      }
      setImportProgress(i + 1);
    }

    setImportErrors(newErrors);
    setImportDone(true);
    setImporting(false);

    if (errorCount === 0) {
      toast.success(`Успешно импортировано ${successCount} записей`);
    } else {
      toast.warning(`Импортировано ${successCount} из ${importRows.length}. ${errorCount} ошибок.`);
    }

    fetchEquipment();
  }, [importRows, fetchEquipment]);

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Шаблон CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
            disabled={equipment.length === 0}
          >
            <Download className="w-4 h-4" />
            Экспорт CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openImportDialog}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Импорт CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        </div>
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

      {/* ─── CSV Import Dialog ──────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) resetImportState(); }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Импорт оборудования из CSV
              </DialogTitle>
              <DialogDescription>
                Загрузите файл CSV для массового импорта оборудования
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 ${importFile ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <motion.div
                  animate={importFile ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${importFile ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'}`}>
                    <Upload className={`w-6 h-6 transition-colors ${importFile ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>
                  {importFile ? (
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(importFile.size / 1024).toFixed(1)} КБ · Нажмите для замены
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Перетащите CSV-файл сюда</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        или нажмите для выбора файла
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Template download hint */}
              {!importFile && (
                <p className="text-xs text-center text-muted-foreground">
                  Нет файла?{' '}
                  <button
                    onClick={(e) => { e.stopPropagation(); setImportDialogOpen(false); handleDownloadTemplate(); }}
                    className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                  >
                    Скачайте шаблон CSV
                  </button>
                </p>
              )}

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Предпросмотр данных
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {importRows.length} записей для импорта
                    </Badge>
                  </div>
                  <div className="rounded-lg border overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {importHeaders.map((header, idx) => (
                            <TableHead key={idx} className="text-xs whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(1).map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="text-xs py-1.5 max-w-[120px] truncate">
                                {cell || <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importRows.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Показаны первые 5 из {importRows.length} записей
                    </p>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Импорт...</span>
                    <span className="font-medium">
                      {importProgress} из {importTotal} импортировано
                    </span>
                  </div>
                  <Progress value={importTotal > 0 ? (importProgress / importTotal) * 100 : 0} className="h-2" />
                </div>
              )}

              {/* Completion Summary */}
              {importDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className={`rounded-lg p-4 ${importErrors.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {importErrors.length === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                      <p className={`text-sm font-medium ${importErrors.length === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {importErrors.length === 0
                          ? `Все ${importTotal} записей успешно импортированы`
                          : `Импортировано ${importProgress - importErrors.length} из ${importTotal}`}
                      </p>
                    </div>
                  </div>

                  {importErrors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Ошибки:</p>
                      <ul className="space-y-1">
                        {importErrors.map((err, idx) => (
                          <li key={idx} className="text-xs text-red-600 dark:text-red-400">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <DialogFooter>
              {!importDone ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setImportDialogOpen(false); resetImportState(); }}
                    disabled={importing}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importRows.length === 0 || importing}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {importing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Импортировать ({importRows.length})
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => { setImportDialogOpen(false); resetImportState(); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Готово
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </motion.div>
      </Dialog>
    </div>
  );
}
