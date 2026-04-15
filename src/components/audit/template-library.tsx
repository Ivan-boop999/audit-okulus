'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Shield, Award, Leaf, Wrench, Sparkles,
  Zap, ClipboardCheck, Copy, Filter, CheckCircle2, Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  difficultyLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  questions: { text: string; answerType: string; required: boolean; weight: number; order: number }[];
}

interface TemplateLibraryProps {
  creatorId: string;
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'Безопасность', label: 'Безопасность' },
  { value: 'Качество', label: 'Качество' },
  { value: 'Экология', label: 'Экология' },
  { value: 'Техобслуживание', label: 'Техобслуживание' },
  { value: 'Гигиена', label: 'Гигиена' },
  { value: 'Электрооборудование', label: 'Электрооборудование' },
] as const;

// ─── Marketplace Templates (hardcoded) ────────────────────────────────────────

const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'tpl-safety-01',
    title: 'Проверка техники безопасности',
    description: 'Комплексный аудит соблюдения требований охраны труда, использования СИЗ, инструктажей и маркировки опасных зон.',
    category: 'Безопасность',
    categoryLabel: 'Безопасность',
    questionCount: 18,
    difficulty: 'hard',
    difficultyLabel: 'Сложный',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    questions: [
      { text: 'Все работники прошли инструктаж по ТБ?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Средства индивидуальной защиты доступны?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Знаки безопасности на месте?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Аптечки первой помощи укомплектованы?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Пути эвакуации свободны?', answerType: 'YES_NO', required: true, weight: 3, order: 4 },
      { text: 'Огнетушители проверены и актуальны?', answerType: 'YES_NO', required: true, weight: 3, order: 5 },
      { text: 'Оценка уровня освещённости рабочих зон', answerType: 'SCALE_1_5', required: true, weight: 1, order: 6 },
      { text: 'Замечания по технике безопасности', answerType: 'TEXT', required: false, weight: 0, order: 7 },
    ],
  },
  {
    id: 'tpl-quality-01',
    title: 'Контроль качества продукции',
    description: 'Аудит производственных процессов на соответствие стандартам качества, проверки сырья и готовой продукции.',
    category: 'Качество',
    categoryLabel: 'Качество',
    questionCount: 14,
    difficulty: 'medium',
    difficultyLabel: 'Средний',
    icon: Award,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    questions: [
      { text: 'Входной контроль сырья проводится?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Документация на партию продукции в порядке?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Оборудование откалибровано?', answerType: 'YES_NO', required: true, weight: 3, order: 2 },
      { text: 'Качество упаковки соответствует стандарту?', answerType: 'SCALE_1_5', required: true, weight: 1, order: 3 },
      { text: 'Журнал контроля качества ведётся?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'Уровень чистоты на производственной линии', answerType: 'SCALE_1_5', required: true, weight: 1, order: 5 },
    ],
  },
  {
    id: 'tpl-env-01',
    title: 'Экологический аудит',
    description: 'Оценка экологических показателей: обращение с отходами, выбросы, энергопотребление и соблюдение экостандартов.',
    category: 'Экология',
    categoryLabel: 'Экология',
    questionCount: 12,
    difficulty: 'medium',
    difficultyLabel: 'Средний',
    icon: Leaf,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    questions: [
      { text: 'Система разделения отходов функционирует?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Лимиты выбросов не превышены?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Экологическая документация актуальна?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Мониторинг энергопотребления ведётся?', answerType: 'YES_NO', required: true, weight: 1, order: 3 },
      { text: 'Оценка состояния систем очистки', answerType: 'SCALE_1_5', required: true, weight: 2, order: 4 },
      { text: 'Замечания по экологической безопасности', answerType: 'TEXT', required: false, weight: 0, order: 5 },
    ],
  },
  {
    id: 'tpl-maint-01',
    title: 'Техническое обслуживание оборудования',
    description: 'Регулярная проверка состояния оборудования, графиков ТО, наличия запчастей и соблюдения регламентов.',
    category: 'Техобслуживание',
    categoryLabel: 'Техобслуживание',
    questionCount: 16,
    difficulty: 'hard',
    difficultyLabel: 'Сложный',
    icon: Wrench,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    questions: [
      { text: 'График ТО соблюдается?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Запасные части в наличии?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Журнал ТО ведётся регулярно?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Вибрация и шум в допустимых пределах?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Смазочные материалы соответствуют стандарту?', answerType: 'YES_NO', required: true, weight: 1, order: 4 },
      { text: 'Общее техническое состояние оборудования', answerType: 'SCALE_1_5', required: true, weight: 2, order: 5 },
    ],
  },
  {
    id: 'tpl-hygiene-01',
    title: 'Санитарная инспекция',
    description: 'Проверка санитарно-гигиенических условий: чистота помещений, туалетов, столовых и рабочих зон.',
    category: 'Гигиена',
    categoryLabel: 'Гигиена',
    questionCount: 10,
    difficulty: 'easy',
    difficultyLabel: 'Простой',
    icon: Sparkles,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    questions: [
      { text: 'Помещения убраны и соответствуют стандартам?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Туалеты чистые и укомплектованы?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Столовая/зона питания соответствует нормам?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Вентиляция работает исправно?', answerType: 'YES_NO', required: true, weight: 1, order: 3 },
      { text: 'Контейнеры для мусора не переполнены?', answerType: 'YES_NO', required: true, weight: 1, order: 4 },
    ],
  },
  {
    id: 'tpl-electric-01',
    title: 'Аудит электрооборудования',
    description: 'Проверка электробезопасности: заземление, УЗО, проводка, щитовые и соответствие нормам ПУЭ.',
    category: 'Электрооборудование',
    categoryLabel: 'Электрооборудование',
    questionCount: 15,
    difficulty: 'hard',
    difficultyLabel: 'Сложный',
    icon: Zap,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    questions: [
      { text: 'Заземление оборудования выполнено?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'УЗО/автоматы в рабочем состоянии?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Электрощитовые заперты и маркированы?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Проводка не повреждена?', answerType: 'YES_NO', required: true, weight: 3, order: 3 },
      { text: 'Акты испытаний электрооборудования актуальны?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'Оценка состояния электроинфраструктуры', answerType: 'SCALE_1_5', required: true, weight: 2, order: 5 },
    ],
  },
];

// ─── Difficulty Badge ─────────────────────────────────────────────────────────

function getDifficultyBadge(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
    case 'hard':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800';
    default:
      return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateLibrary({ creatorId }: TemplateLibraryProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MARKETPLACE_TEMPLATES.filter((t) => {
      const matchesSearch = search === '' ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  const handleUseTemplate = async (template: MarketplaceTemplate) => {
    setCopyingId(template.id);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          category: template.category,
          status: 'ACTIVE',
          frequency: 'MONTHLY',
          creatorId,
          questions: template.questions,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Шаблон «${template.title}» скопирован в ваши шаблоны`);
    } catch {
      toast.error('Не удалось скопировать шаблон');
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-500" />
          Библиотека шаблонов
        </h1>
        <p className="text-muted-foreground mt-1">
          Готовые шаблоны для быстрого начала аудита
        </p>
      </motion.div>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск шаблонов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap text-xs h-8"
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, i) => {
            const Icon = template.icon;
            const isCopying = copyingId === template.id;
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${template.bgColor} border ${template.borderColor} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${template.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{template.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${template.bgColor} ${template.color} border-0`}>
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${getDifficultyBadge(template.difficulty)}`}>
                        {template.difficulty === 'easy' && <Star className="w-2.5 h-2.5 mr-0.5" />}
                        {template.difficultyLabel}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <ClipboardCheck className="w-2.5 h-2.5" />
                        {template.questionCount} вопросов
                      </Badge>
                    </div>

                    {/* Use Button */}
                    <Button
                      className="w-full gap-2"
                      size="sm"
                      disabled={isCopying}
                      onClick={() => handleUseTemplate(template)}
                    >
                      {isCopying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Копирование...
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Использовать шаблон
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Шаблоны не найдены</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Попробуйте изменить параметры поиска</p>
        </motion.div>
      )}
    </div>
  );
}
