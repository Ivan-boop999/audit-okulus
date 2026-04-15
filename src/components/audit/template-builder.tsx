'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, FileText, HelpCircle, AlertTriangle,
  CheckCircle2, Clock, Archive, Eye, X, Filter,
  ListChecks, ClipboardList, CalendarClock,
  Star, ArrowUpDown, Settings2, Copy, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogFooter, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONCE';
type AnswerType =
  | 'TEXT' | 'NUMBER' | 'YES_NO' | 'SCALE_1_5' | 'SCALE_1_10'
  | 'SCALE_1_100' | 'MULTIPLE_CHOICE' | 'PHOTO' | 'DATE' | 'CHECKLIST';

interface TemplateQuestion {
  id?: string;
  text: string;
  answerType: AnswerType;
  required: boolean;
  weight: number;
  helpText?: string | null;
  options?: string | null;
  order: number;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: Frequency;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  creator?: { id: string; name: string; email: string } | null;
  questions?: TemplateQuestion[];
  equipment?: { id: string; name: string }[];
  _count?: {
    assignments?: number;
    questions?: number;
    equipment?: number;
  };
}

interface TemplateFormData {
  title: string;
  description: string;
  category: string;
  frequency: Frequency;
  status: TemplateStatus;
}

interface QuestionFormData {
  text: string;
  answerType: AnswerType;
  required: boolean;
  weight: number;
  helpText: string;
  options: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyTemplateForm: TemplateFormData = {
  title: '',
  description: '',
  category: '',
  frequency: 'MONTHLY',
  status: 'DRAFT',
};

const emptyQuestionForm: QuestionFormData = {
  text: '',
  answerType: 'TEXT',
  required: false,
  weight: 1,
  helpText: '',
  options: '',
};

const TEMPLATE_CATEGORIES = [
  'Безопасность труда',
  'Качество продукции',
  'Техническое обслуживание',
  'Охрана окружающей среды',
  'Санитарные условия',
  'Пожарная безопасность',
  'Электробезопасность',
  'Логистика и склад',
  'Документация',
  'Обучение персонала',
  'Другое',
];

const FREQUENCIES: { value: Frequency; label: string; icon: React.ElementType }[] = [
  { value: 'DAILY', label: 'Ежедневно', icon: Clock },
  { value: 'WEEKLY', label: 'Еженедельно', icon: CalendarClock },
  { value: 'MONTHLY', label: 'Ежемесячно', icon: CalendarClock },
  { value: 'QUARTERLY', label: 'Ежеквартально', icon: CalendarClock },
  { value: 'YEARLY', label: 'Ежегодно', icon: CalendarClock },
  { value: 'ONCE', label: 'Одноразово', icon: CheckCircle2 },
];

const ANSWER_TYPES: { value: AnswerType; label: string; shortLabel: string; color: string }[] = [
  { value: 'TEXT', label: 'Текстовый ответ', shortLabel: 'ТЕКСТ', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'NUMBER', label: 'Числовое значение', shortLabel: 'ЧИСЛО', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'YES_NO', label: 'Да / Нет', shortLabel: 'ДА/НЕТ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'SCALE_1_5', label: 'Шкала от 1 до 5', shortLabel: 'Шкала 1-5', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'SCALE_1_10', label: 'Шкала от 1 до 10', shortLabel: 'Шкала 1-10', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'SCALE_1_100', label: 'Шкала от 1 до 100', shortLabel: 'Шкала 1-100', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'MULTIPLE_CHOICE', label: 'Множественный выбор', shortLabel: 'Мн. выбор', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'PHOTO', label: 'Фотография', shortLabel: 'Фото', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'DATE', label: 'Дата', shortLabel: 'Дата', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'CHECKLIST', label: 'Чек-лист', shortLabel: 'Чек-лист', color: 'bg-teal-100 text-teal-700 border-teal-200' },
];

const STATUS_CONFIG: Record<TemplateStatus, {
  label: string;
  color: string;
  dotColor: string;
  icon: React.ElementType;
}> = {
  DRAFT: {
    label: 'Черновик',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    dotColor: 'bg-slate-400',
    icon: FileText,
  },
  ACTIVE: {
    label: 'Активен',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  ARCHIVED: {
    label: 'Архив',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Archive,
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Безопасность труда': 'bg-red-50 text-red-700 border-red-200',
  'Качество продукции': 'bg-blue-50 text-blue-700 border-blue-200',
  'Техническое обслуживание': 'bg-amber-50 text-amber-700 border-amber-200',
  'Охрана окружающей среды': 'bg-green-50 text-green-700 border-green-200',
  'Санитарные условия': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Пожарная безопасность': 'bg-orange-50 text-orange-700 border-orange-200',
  'Электробезопасность': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Логистика и склад': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Документация': 'bg-slate-50 text-slate-700 border-slate-200',
  'Обучение персонала': 'bg-violet-50 text-violet-700 border-violet-200',
  'Другое': 'bg-gray-50 text-gray-700 border-gray-200',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  YEARLY: 'Ежегодно',
  ONCE: 'Одноразово',
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.2 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAnswerTypeConfig(type: AnswerType) {
  return ANSWER_TYPES.find((at) => at.value === type) || ANSWER_TYPES[0];
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Другое'];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateBuilder() {
  // Data state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormData>(emptyTemplateForm);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  // Question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionTargetTemplate, setQuestionTargetTemplate] = useState<Template | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormData>(emptyQuestionForm);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Expanded templates for questions view
  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);

  // Sort state
  const [sortField, setSortField] = useState<'title' | 'status' | 'frequency' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error('Не удалось загрузить шаблоны');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ─── Derived / Filtered / Sorted ─────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let items = [...templates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }

    if (filterCategory !== 'all') {
      items = items.filter((t) => t.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      items = items.filter((t) => t.status === filterStatus);
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'frequency') cmp = a.frequency.localeCompare(b.frequency);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [templates, searchQuery, filterCategory, filterStatus, sortField, sortDir]);

  const uniqueCategories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates],
  );

  const statusCounts = useMemo(
    () => ({
      DRAFT: templates.filter((t) => t.status === 'DRAFT').length,
      ACTIVE: templates.filter((t) => t.status === 'ACTIVE').length,
      ARCHIVED: templates.filter((t) => t.status === 'ARCHIVED').length,
    }),
    [templates],
  );

  // ─── Template Handlers ───────────────────────────────────────────────────

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title,
      description: template.description || '',
      category: template.category,
      frequency: template.frequency,
      status: template.status,
    });
    setTemplateDialogOpen(true);
  };

  const handleCloneTemplate = async (template: Template) => {
    try {
      toast.loading('Клонирование шаблона...', { id: 'clone' });
      const res = await fetch('/api/templates');
      const allTemplates = await res.json();
      const fullTemplate = allTemplates.find((t: Template) => t.id === template.id);
      if (!fullTemplate) throw new Error('Template not found');

      const clonedData = {
        title: `${template.title} (Копия)`,
        description: template.description || '',
        category: template.category,
        frequency: template.frequency,
        status: 'DRAFT' as TemplateStatus,
        creatorId: '',
        questions: (fullTemplate.questions || []).map((q: TemplateQuestion, i: number) => ({
          text: q.text,
          answerType: q.answerType,
          required: q.required,
          weight: q.weight,
          order: q.order ?? i,
          helpText: q.helpText,
          options: q.options,
        })),
        equipmentIds: (fullTemplate.equipment || []).map((e: { id: string }) => e.id),
      };

      const createRes = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clonedData),
      });

      if (!createRes.ok) throw new Error('Clone failed');
      toast.success('Шаблон склонирован', { id: 'clone' });
      fetchTemplates();
    } catch {
      toast.error('Не удалось клонировать шаблон', { id: 'clone' });
    }
  };

  const handleTemplateFormChange = (field: keyof TemplateFormData, value: string) => {
    setTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateSubmit = async () => {
    if (!templateForm.title.trim()) { toast.error('Введите название шаблона'); return; }
    if (!templateForm.category) { toast.error('Выберите категорию'); return; }

    setTemplateSubmitting(true);
    try {
      const url = '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      const body = editingTemplate
        ? { id: editingTemplate.id, ...templateForm }
        : templateForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Request failed');

      toast.success(editingTemplate ? 'Шаблон обновлён' : 'Шаблон создан');
      setTemplateDialogOpen(false);
      fetchTemplates();
    } catch {
      toast.error(editingTemplate ? 'Не удалось обновить шаблон' : 'Не удалось создать шаблон');
    } finally {
      setTemplateSubmitting(false);
    }
  };

  // ─── Question Handlers ───────────────────────────────────────────────────

  const openAddQuestion = (template: Template) => {
    setQuestionTargetTemplate(template);
    setQuestionForm(emptyQuestionForm);
    setQuestionDialogOpen(true);
  };

  const handleQuestionFormChange = (field: keyof QuestionFormData, value: string | boolean | number) => {
    setQuestionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuestionSubmit = async () => {
    if (!questionForm.text.trim()) { toast.error('Введите текст вопроса'); return; }
    if (!questionTargetTemplate) return;

    setQuestionSubmitting(true);
    try {
      const newQuestion: Omit<TemplateQuestion, 'id'> = {
        text: questionForm.text,
        answerType: questionForm.answerType,
        required: questionForm.required,
        weight: questionForm.weight,
        helpText: questionForm.helpText || null,
        options: questionForm.answerType === 'MULTIPLE_CHOICE' && questionForm.options.trim()
          ? questionForm.options
          : null,
        order: (questionTargetTemplate.questions?.length || (questionTargetTemplate._count?.questions || 0)) + 1,
      };

      const body: Record<string, unknown> = {
        id: questionTargetTemplate.id,
        questions: [
          ...(questionTargetTemplate.questions || []),
          newQuestion,
        ],
      };

      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Request failed');

      toast.success('Вопрос добавлен');
      setQuestionDialogOpen(false);
      fetchTemplates();
    } catch {
      toast.error('Не удалось добавить вопрос');
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (template: Template, questionIndex: number) => {
    const questions = [...(template.questions || [])];
    const removed = questions.splice(questionIndex, 1);

    try {
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, questions }),
      });

      if (!res.ok) throw new Error('Request failed');

      toast.success(`Вопрос «${removed[0].text.substring(0, 40)}...» удалён`);
      fetchTemplates();
    } catch {
      toast.error('Не удалось удалить вопрос');
    }
  };

  // ─── Delete Handlers ─────────────────────────────────────────────────────

  const openDeleteTemplate = (template: Template) => {
    setDeletingTemplate(template);
    setDeleteOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/templates?id=${deletingTemplate.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Шаблон удалён');
      setDeleteOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch {
      toast.error('Не удалось удалить шаблон');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ─── Sort Toggle ─────────────────────────────────────────────────────────

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Шаблоны аудитов</h1>
          <p className="text-muted-foreground mt-1">
            Создание и управление шаблонами проверок
          </p>
        </div>
        <Button onClick={openCreateTemplate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <Plus className="w-4 h-4" />
          Создать шаблон
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { key: 'ACTIVE' as TemplateStatus, label: 'Активные', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { key: 'DRAFT' as TemplateStatus, label: 'Черновики', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
          { key: 'ARCHIVED' as TemplateStatus, label: 'В архиве', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        ]).map((s) => {
          const cfg = STATUS_CONFIG[s.key];
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
                    <div className="text-2xl font-bold">{statusCounts[s.key]}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, описанию, категории..."
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
              <SelectTrigger className="w-full lg:w-[200px] h-10">
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
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                      {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="shimmer h-5 w-3/4 rounded mb-3" />
                <div className="shimmer h-3 w-1/2 rounded mb-2" />
                <div className="shimmer h-3 w-2/3 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-20 rounded-full" />
                  <div className="shimmer h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground">Шаблоны не найдены</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Попробуйте изменить параметры поиска или фильтры'
              : 'Нажмите кнопку выше, чтобы создать первый шаблон'}
          </p>
          {!searchQuery && filterCategory === 'all' && filterStatus === 'all' && (
            <Button onClick={openCreateTemplate} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" />
              Создать шаблон
            </Button>
          )}
        </motion.div>
      ) : (
        /* ─── Template Cards Grid ─────────────────────────────────────────── */
        <motion.div
          key="templates-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template) => {
              const statusCfg = STATUS_CONFIG[template.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = statusCfg.icon;
              const catColor = getCategoryColor(template.category);
              const questionCount = template.questions?.length || template._count?.questions || 0;
              const assignmentCount = template._count?.assignments || 0;
              const freqLabel = FREQUENCY_LABELS[template.frequency] || template.frequency;

              return (
                <motion.div
                  key={template.id}
                  variants={cardVariants}
                  exit="exit"
                  layout
                >
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border hover:border-emerald-200 dark:hover:border-emerald-800">
                    {/* Status color strip */}
                    <div className={`h-1 ${
                      template.status === 'ACTIVE' ? 'bg-emerald-500' :
                      template.status === 'ARCHIVED' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${catColor} flex-shrink-0 mt-0.5`}>
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold leading-tight truncate">
                              {template.title}
                            </CardTitle>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCloneTemplate(template)}
                            title="Клонировать"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditTemplate(template)}
                            title="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => openDeleteTemplate(template)}
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {/* Info row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3.5 h-3.5" />
                          {questionCount} {questionCount === 1 ? 'вопрос' : questionCount < 5 ? 'вопроса' : 'вопросов'}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {assignmentCount} {assignmentCount === 1 ? 'назначение' : assignmentCount < 5 ? 'назначения' : 'назначений'}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {freqLabel}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] ${catColor}`}>
                          {template.category}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] gap-1.5 ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Expand questions toggle */}
                      {questionCount > 0 && (
                        <>
                          <Separator />
                          <Accordion
                            type="single"
                            collapsible
                            value={expandedTemplates.includes(template.id) ? template.id : undefined}
                            onValueChange={(value) => {
                              setExpandedTemplates((prev) =>
                                value === template.id
                                  ? [...prev, template.id]
                                  : prev.filter((id) => id !== template.id),
                              );
                            }}
                          >
                            <AccordionItem value={template.id} className="border-none">
                              <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline hover:text-foreground transition-colors">
                                <span className="flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5" />
                                  Просмотр вопросов ({questionCount})
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <ScrollArea className="max-h-[320px] pr-2">
                                  <div className="space-y-2">
                                    {(template.questions || []).map((question, idx) => {
                                      const atConfig = getAnswerTypeConfig(question.answerType);
                                      return (
                                        <motion.div
                                          key={question.id || idx}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.03 }}
                                          className="group/q flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                                        >
                                          {/* Order number */}
                                          <div className="w-6 h-6 rounded-md bg-background border flex items-center justify-center text-[11px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                                            {question.order || idx + 1}
                                          </div>

                                          {/* Question content */}
                                          <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-sm font-medium leading-tight">
                                                {question.text}
                                              </span>
                                              {question.required && (
                                                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1.5 py-0">
                                                  Обяз.
                                                </Badge>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Badge variant="outline" className={`text-[10px] ${atConfig.color}`}>
                                                {atConfig.shortLabel}
                                              </Badge>
                                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Star className="w-3 h-3" />
                                                Вес: {question.weight}
                                              </span>
                                              {question.helpText && (
                                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title={question.helpText}>
                                                  <HelpCircle className="w-3 h-3" />
                                                  Подсказка
                                                </span>
                                              )}
                                            </div>

                                            {question.answerType === 'MULTIPLE_CHOICE' && question.options && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {(() => {
                                                  try {
                                                    const opts = JSON.parse(question.options);
                                                    return (Array.isArray(opts) ? opts : []).map((opt: string, oi: number) => (
                                                      <span key={oi} className="inline-flex items-center text-[10px] bg-violet-50 text-violet-600 border border-violet-200 rounded px-1.5 py-0.5">
                                                        {opt}
                                                      </span>
                                                    ));
                                                  } catch {
                                                    return (
                                                      <span className="text-[10px] text-red-500 italic">Ошибка парсинга опций</span>
                                                    );
                                                  }
                                                })()}
                                              </div>
                                            )}
                                          </div>

                                          {/* Delete question button */}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/q:opacity-100 transition-opacity flex-shrink-0"
                                            onClick={() => handleDeleteQuestion(template, idx)}
                                            title="Удалить вопрос"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                </ScrollArea>

                                {/* Add question button inside accordion */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 w-full gap-2 text-xs border-dashed"
                                  onClick={() => openAddQuestion(template)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Добавить вопрос
                                </Button>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </>
                      )}

                      {/* No questions — add question button */}
                      {questionCount === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 text-xs border-dashed text-muted-foreground hover:text-emerald-600 hover:border-emerald-300"
                          onClick={() => openAddQuestion(template)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Добавить вопрос
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results Count */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          Показано {filteredTemplates.length} из {templates.length} шаблонов
        </div>
      )}

      {/* Sort bar (subtle, below results) */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Сортировка:</span>
          {([
            { field: 'createdAt' as const, label: 'Дате создания' },
            { field: 'title' as const, label: 'Названию' },
            { field: 'status' as const, label: 'Статусу' },
            { field: 'frequency' as const, label: 'Частоте' },
          ]).map((s) => (
            <button
              key={s.field}
              onClick={() => toggleSort(s.field)}
              className={`px-2 py-1 rounded-md transition-colors ${
                sortField === s.field
                  ? 'bg-emerald-100 text-emerald-700 font-medium'
                  : 'hover:bg-muted'
              }`}
            >
              {s.label}
              {sortField === s.field && (
                <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Create / Edit Template Dialog ───────────────────────────────── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? (
                <>
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Редактировать шаблон
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Создать шаблон
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Измените данные шаблона и сохраните'
                : 'Заполните информацию о новом шаблоне аудита'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="tpl-title">
                Название <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tpl-title"
                placeholder="Например: Проверка безопасности прессового цеха"
                value={templateForm.title}
                onChange={(e) => handleTemplateFormChange('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="tpl-desc">Описание</Label>
              <Textarea
                id="tpl-desc"
                placeholder="Краткое описание назначения шаблона..."
                value={templateForm.description}
                onChange={(e) => handleTemplateFormChange('description', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Category & Frequency row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Категория <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(v) => handleTemplateFormChange('category', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Частота</Label>
                <Select
                  value={templateForm.frequency}
                  onValueChange={(v) => handleTemplateFormChange('frequency', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => {
                      const Icon = f.icon;
                      return (
                        <SelectItem key={f.value} value={f.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {f.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={templateForm.status}
                onValueChange={(v) => handleTemplateFormChange('status', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              disabled={templateSubmitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleTemplateSubmit}
              disabled={templateSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {templateSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : editingTemplate ? (
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

      {/* ─── Add Question Dialog ──────────────────────────────────────────── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Добавить вопрос
            </DialogTitle>
            <DialogDescription>
              {questionTargetTemplate && (
                <>В шаблон: <span className="font-semibold text-foreground">&laquo;{questionTargetTemplate.title}&raquo;</span></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Question Text */}
            <div className="grid gap-2">
              <Label htmlFor="q-text">
                Текст вопроса <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="q-text"
                placeholder="Например: Проверена ли целостность ограждений?"
                value={questionForm.text}
                onChange={(e) => handleQuestionFormChange('text', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Answer Type & Weight row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Тип ответа</Label>
                <Select
                  value={questionForm.answerType}
                  onValueChange={(v) => handleQuestionFormChange('answerType', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANSWER_TYPES.map((at) => (
                      <SelectItem key={at.value} value={at.value}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${at.color} px-1.5 py-0 border`}>
                            {at.shortLabel}
                          </Badge>
                          <span className="text-sm">{at.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="q-weight">Вес (1-5)</Label>
                <Input
                  id="q-weight"
                  type="number"
                  min={1}
                  max={5}
                  value={questionForm.weight}
                  onChange={(e) => handleQuestionFormChange('weight', Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Required toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">Обязательный вопрос</div>
                  <div className="text-xs text-muted-foreground">
                    Аудитор не сможет пропустить этот вопрос
                  </div>
                </div>
              </div>
              <Switch
                checked={questionForm.required}
                onCheckedChange={(checked) => handleQuestionFormChange('required', checked)}
              />
            </div>

            {/* Help Text */}
            <div className="grid gap-2">
              <Label htmlFor="q-help" className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                Подсказка
              </Label>
              <Textarea
                id="q-help"
                placeholder="Дополнительная информация или инструкция для аудитора..."
                value={questionForm.helpText}
                onChange={(e) => handleQuestionFormChange('helpText', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Options for MULTIPLE_CHOICE */}
            {questionForm.answerType === 'MULTIPLE_CHOICE' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid gap-2"
              >
                <Label htmlFor="q-options" className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-violet-500" />
                  Варианты выбора (JSON массив)
                </Label>
                <Textarea
                  id="q-options"
                  placeholder='["Вариант 1", "Вариант 2", "Вариант 3"]'
                  value={questionForm.options}
                  onChange={(e) => handleQuestionFormChange('options', e.target.value)}
                  rows={3}
                  className="resize-none font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Введите массив строк в формате JSON. Например: ["Да", "Нет", "Частично"]
                </p>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
              disabled={questionSubmitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleQuestionSubmit}
              disabled={questionSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {questionSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Добавить вопрос
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
              Удалить шаблон?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Вы уверены, что хотите удалить шаблон{' '}
                  <span className="font-semibold text-foreground">
                    &laquo;{deletingTemplate?.title}&raquo;
                  </span>
                  ?
                </p>
                {deletingTemplate && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Категория:</span>
                      <span>{deletingTemplate.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Частота:</span>
                      <span>{FREQUENCY_LABELS[deletingTemplate.frequency]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Статус:</span>
                      <span>{STATUS_CONFIG[deletingTemplate.status].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Вопросов:</span>
                      <span>{deletingTemplate.questions?.length || deletingTemplate._count?.questions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Назначений:</span>
                      <span>{deletingTemplate._count?.assignments || 0}</span>
                    </div>
                  </div>
                )}
                <p className="text-red-500 font-medium text-xs">
                  Это действие нельзя отменить. Все связанные вопросы и назначения будут затронуты.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTemplate();
              }}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {deleteSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
