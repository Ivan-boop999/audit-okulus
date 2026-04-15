'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Shield, Award, Leaf, Wrench, Sparkles,
  Download, Eye, Clock, ClipboardCheck, Filter, X,
  Flame, Zap, Droplets, HardHat, Warehouse, Battery,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateQuestion {
  text: string;
  answerType: string;
  required: boolean;
  weight: number;
  order: number;
}

interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficultyLabel: string;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  questions: TemplateQuestion[];
}

interface TemplateLibraryProps {
  creatorId: string;
}

// ─── Answer Type Labels ───────────────────────────────────────────────────────

const ANSWER_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  TEXT: { label: 'Текст', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  NUMBER: { label: 'Число', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  YES_NO: { label: 'Да/Нет', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  SCALE_1_5: { label: 'Шкала 1-5', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  SCALE_1_10: { label: 'Шкала 1-10', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  MULTIPLE_CHOICE: { label: 'Выбор', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  PHOTO: { label: 'Фото', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  DATE: { label: 'Дата', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  CHECKLIST: { label: 'Чек-лист', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
};

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'Безопасность', label: 'Безопасность' },
  { value: 'Качество', label: 'Качество' },
  { value: 'Экология', label: 'Экология' },
  { value: 'Техническое', label: 'Техническое' },
  { value: 'Санитария', label: 'Санитария' },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Безопасность': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  'Качество': {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  'Экология': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  'Техническое': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  'Санитария': {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
};

// ─── Difficulty Config ────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  beginner: {
    label: 'Начальный',
    dots: 1,
    color: 'bg-emerald-500',
    inactiveColor: 'bg-muted',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  intermediate: {
    label: 'Средний',
    dots: 2,
    color: 'bg-amber-500',
    inactiveColor: 'bg-muted',
    textColor: 'text-amber-700 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  advanced: {
    label: 'Продвинутый',
    dots: 3,
    color: 'bg-red-500',
    inactiveColor: 'bg-muted',
    textColor: 'text-red-700 dark:text-red-400',
    badgeBg: 'bg-red-100 dark:bg-red-900/40',
  },
} as const;

// ─── Marketplace Templates ────────────────────────────────────────────────────

const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  // ─── 1. Пожарная безопасность (Fire Safety) ─────────────────────────────
  {
    id: 'tpl-fire-safety',
    title: 'Пожарная безопасность',
    description: 'Комплексная проверка средств пожаротушения, путей эвакуации, сигнализации и соблюдения противопожарных норм на производственном объекте.',
    category: 'Безопасность',
    questionCount: 10,
    estimatedMinutes: 25,
    difficulty: 'advanced',
    difficultyLabel: 'Продвинутый',
    icon: Flame,
    gradientFrom: 'from-red-500/10',
    gradientTo: 'to-orange-500/5',
    questions: [
      { text: 'Огнетушители проверены, заправлены и находятся на своих местах?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Пути эвакуации свободны и не загромождены?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Знаки эвакуации и указатели аварийных выходов на месте?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Система пожарной сигнализации работает корректно?', answerType: 'YES_NO', required: true, weight: 3, order: 3 },
      { text: 'Автоматическая система пожаротушения проверена?', answerType: 'YES_NO', required: true, weight: 3, order: 4 },
      { text: 'Дата последней проверки пожарных гидрантов', answerType: 'DATE', required: true, weight: 2, order: 5 },
      { text: 'Персонал прошёл инструктаж по пожарной безопасности?', answerType: 'YES_NO', required: true, weight: 3, order: 6 },
      { text: 'План эвакуации актуален и размещён на видных местах?', answerType: 'YES_NO', required: true, weight: 2, order: 7 },
      { text: 'Оценка готовности к ликвидации пожара (1-10)', answerType: 'SCALE_1_10', required: true, weight: 2, order: 8 },
      { text: 'Замечания и рекомендации по пожарной безопасности', answerType: 'TEXT', required: false, weight: 0, order: 9 },
    ],
  },
  // ─── 2. Контроль качества продукции (Product Quality Control) ───────────
  {
    id: 'tpl-quality-control',
    title: 'Контроль качества продукции',
    description: 'Аудит производственных процессов на соответствие стандартам качества: входной контроль сырья, калибровка оборудования, контроль готовой продукции.',
    category: 'Качество',
    questionCount: 12,
    estimatedMinutes: 35,
    difficulty: 'intermediate',
    difficultyLabel: 'Средний',
    icon: Award,
    gradientFrom: 'from-blue-500/10',
    gradientTo: 'to-cyan-500/5',
    questions: [
      { text: 'Входной контроль сырья проводится согласно регламенту?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Документация на партию сырья в порядке?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Измерительное оборудование откалибровано?', answerType: 'YES_NO', required: true, weight: 3, order: 2 },
      { text: 'Уровень брака в текущей партии (в %)', answerType: 'NUMBER', required: true, weight: 3, order: 3 },
      { text: 'Качество упаковки соответствует стандарту?', answerType: 'SCALE_1_5', required: true, weight: 2, order: 4 },
      { text: 'Журнал контроля качества ведётся регулярно?', answerType: 'YES_NO', required: true, weight: 2, order: 5 },
      { text: 'Общее качество производственной линии (1-10)', answerType: 'SCALE_1_10', required: true, weight: 2, order: 6 },
      { text: 'Маркировка продукции соответствует нормативам?', answerType: 'YES_NO', required: true, weight: 2, order: 7 },
      { text: 'Условия хранения готовой продукции соблюдаются?', answerType: 'YES_NO', required: true, weight: 2, order: 8 },
      { text: 'Фотографии выявленных дефектов', answerType: 'PHOTO', required: false, weight: 1, order: 9 },
      { text: 'Соответствие продукции ГОСТ/ТУ', answerType: 'YES_NO', required: true, weight: 3, order: 10 },
      { text: 'Замечания и корректирующие действия', answerType: 'TEXT', required: false, weight: 0, order: 11 },
    ],
  },
  // ─── 3. Охрана труда (Occupational Health) ─────────────────────────────
  {
    id: 'tpl-occupational-health',
    title: 'Охрана труда',
    description: 'Проверка соблюдения требований охраны труда: использование СИЗ, проведение инструктажей, организация рабочих мест, безопасность операций.',
    category: 'Безопасность',
    questionCount: 8,
    estimatedMinutes: 20,
    difficulty: 'intermediate',
    difficultyLabel: 'Средний',
    icon: HardHat,
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-yellow-500/5',
    questions: [
      { text: 'Все работники прошли вводный инструктаж по охране труда?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Средства индивидуальной защиты (СИЗ) предоставлены работникам?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'СИЗ соответствуют нормативам и используются по назначению?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Рабочие места соответствуют требованиям эргономики?', answerType: 'SCALE_1_5', required: true, weight: 2, order: 3 },
      { text: 'Журнал инструктажей по охране труда ведётся?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'На опасных участках установлены предупреждающие знаки?', answerType: 'YES_NO', required: true, weight: 2, order: 5 },
      { text: 'Оценка общего уровня безопасности труда (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 6 },
      { text: 'Замечания по охране труда', answerType: 'TEXT', required: false, weight: 0, order: 7 },
    ],
  },
  // ─── 4. Экологический мониторинг (Environmental Monitoring) ────────────
  {
    id: 'tpl-env-monitoring',
    title: 'Экологический мониторинг',
    description: 'Оценка экологических показателей производства: выбросы, водоотведение, обращение с отходами, энергопотребление и соблюдение эконорм.',
    category: 'Экология',
    questionCount: 7,
    estimatedMinutes: 20,
    difficulty: 'advanced',
    difficultyLabel: 'Продвинутый',
    icon: Leaf,
    gradientFrom: 'from-emerald-500/10',
    gradientTo: 'to-teal-500/5',
    questions: [
      { text: 'Лимиты выбросов в атмосферу не превышены?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Система очистных сооружений работает корректно?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Система разделения отходов функционирует?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Лимиты на водоотведение не превышены?', answerType: 'YES_NO', required: true, weight: 3, order: 3 },
      { text: 'Экологическая документация актуальна и доступна?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'Оценка состояния очистного оборудования (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 5 },
      { text: 'Замечания по экологической безопасности', answerType: 'TEXT', required: false, weight: 0, order: 6 },
    ],
  },
  // ─── 5. Техническое обслуживание станков (Equipment Maintenance) ───────
  {
    id: 'tpl-equipment-maint',
    title: 'Техническое обслуживание станков',
    description: 'Регулярная проверка состояния производственного оборудования: вибрация, шум, смазка, графики ТО и наличие запчастей.',
    category: 'Техническое',
    questionCount: 10,
    estimatedMinutes: 30,
    difficulty: 'advanced',
    difficultyLabel: 'Продвинутый',
    icon: Wrench,
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-orange-500/5',
    questions: [
      { text: 'График технического обслуживания соблюдается?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Необходимые запасные части в наличии?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Журнал ТО ведётся регулярно и корректно?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Уровень вибрации оборудования в допустимых пределах?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Уровень шума оборудования в допустимых пределах?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'Смазочные материалы соответствуют стандартам?', answerType: 'YES_NO', required: true, weight: 1, order: 5 },
      { text: 'Дата последней замены фильтров', answerType: 'DATE', required: true, weight: 2, order: 6 },
      { text: 'Общее техническое состояние оборудования (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 7 },
      { text: 'Температура узлов и агрегатов в норме?', answerType: 'YES_NO', required: true, weight: 1, order: 8 },
      { text: 'Замечания по техническому состоянию', answerType: 'TEXT', required: false, weight: 0, order: 9 },
    ],
  },
  // ─── 6. Санитарные нормы производства (Production Hygiene Standards) ───
  {
    id: 'tpl-hygiene-standards',
    title: 'Санитарные нормы производства',
    description: 'Проверка санитарно-гигиенических условий на производстве: чистота помещений, вентиляция, освещение, туалеты и зоны отдыха.',
    category: 'Санитария',
    questionCount: 9,
    estimatedMinutes: 20,
    difficulty: 'beginner',
    difficultyLabel: 'Начальный',
    icon: Sparkles,
    gradientFrom: 'from-violet-500/10',
    gradientTo: 'to-purple-500/5',
    questions: [
      { text: 'Производственные помещения убраны и соответствуют стандартам?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Санитарные зоны и туалеты чистые и укомплектованы?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Столовая/зона приёма пищи соответствует нормам?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Приточно-вытяжная вентиляция работает исправно?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Уровень освещённости рабочих зон соответствует нормам?', answerType: 'SCALE_1_5', required: true, weight: 2, order: 4 },
      { text: 'Контейнеры для мусора не переполнены, раздельный сбор?', answerType: 'YES_NO', required: true, weight: 1, order: 5 },
      { text: 'Входные группы оснащены ковриками и дезинфекцией?', answerType: 'CHECKLIST', required: true, weight: 1, order: 6 },
      { text: 'Оценка санитарного состояния (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 7 },
      { text: 'Замечания по санитарному состоянию', answerType: 'TEXT', required: false, weight: 0, order: 8 },
    ],
  },
  // ─── 7. Безопасность складских операций (Warehouse Safety) ─────────────
  {
    id: 'tpl-warehouse-safety',
    title: 'Безопасность складских операций',
    description: 'Аудит безопасности складских помещений: штабелирование грузов, погрузочно-разгрузочные работы, маркировка и зонирование.',
    category: 'Безопасность',
    questionCount: 8,
    estimatedMinutes: 25,
    difficulty: 'intermediate',
    difficultyLabel: 'Средний',
    icon: Warehouse,
    gradientFrom: 'from-red-500/10',
    gradientTo: 'to-rose-500/5',
    questions: [
      { text: 'Грузы штабелируются согласно инструкции по складированию?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Проходы между стеллажами свободны и не загромождены?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Погрузчики и техника технически исправны?', answerType: 'YES_NO', required: true, weight: 3, order: 2 },
      { text: 'Водители погрузчиков имеют соответствующие удостоверения?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Опасные грузы маркированы и хранятся отдельно?', answerType: 'YES_NO', required: true, weight: 3, order: 4 },
      { text: 'Система вентиляции склада работает исправно?', answerType: 'YES_NO', required: true, weight: 1, order: 5 },
      { text: 'Пожарная безопасность склада (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 6 },
      { text: 'Замечания по безопасности складских операций', answerType: 'TEXT', required: false, weight: 0, order: 7 },
    ],
  },
  // ─── 8. Энергетическая эффективность (Energy Efficiency) ───────────────
  {
    id: 'tpl-energy-efficiency',
    title: 'Энергетическая эффективность',
    description: 'Оценка энергопотребления оборудования и освещения, выявление потерь энергии, проверка систем энергоучёта.',
    category: 'Экология',
    questionCount: 6,
    estimatedMinutes: 15,
    difficulty: 'beginner',
    difficultyLabel: 'Начальный',
    icon: Battery,
    gradientFrom: 'from-emerald-500/10',
    gradientTo: 'to-green-500/5',
    questions: [
      { text: 'Система учёта энергопотребления установлена и работает?', answerType: 'YES_NO', required: true, weight: 2, order: 0 },
      { text: 'Энергосберегающее оборудование используется?', answerType: 'YES_NO', required: true, weight: 2, order: 1 },
      { text: 'Освещение помещений использует LED-технологии?', answerType: 'YES_NO', required: true, weight: 1, order: 2 },
      { text: 'Среднее энергопотребление за месяц (кВт⋅ч)', answerType: 'NUMBER', required: true, weight: 2, order: 3 },
      { text: 'Потенциальные источники энергопотерь идентифицированы?', answerType: 'CHECKLIST', required: true, weight: 1, order: 4 },
      { text: 'Замечания и рекомендации по энергосбережению', answerType: 'TEXT', required: false, weight: 0, order: 5 },
    ],
  },
  // ─── 9. Электробезопасность (Electrical Safety) ────────────────────────
  {
    id: 'tpl-electrical-safety',
    title: 'Электробезопасность',
    description: 'Проверка электробезопасности: заземление, УЗО, автоматические выключатели, состояние проводки и электрощитовых.',
    category: 'Техническое',
    questionCount: 8,
    estimatedMinutes: 25,
    difficulty: 'advanced',
    difficultyLabel: 'Продвинутый',
    icon: Zap,
    gradientFrom: 'from-amber-500/10',
    gradientTo: 'to-yellow-500/5',
    questions: [
      { text: 'Заземление всего оборудования выполнено корректно?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'УЗО и автоматические выключатели в рабочем состоянии?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Электрощитовые заперты и имеют правильную маркировку?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Электрическая проводка не повреждена и не имеет износа?', answerType: 'YES_NO', required: true, weight: 3, order: 3 },
      { text: 'Акты испытаний электрооборудования актуальны?', answerType: 'YES_NO', required: true, weight: 2, order: 4 },
      { text: 'Персонал допущен к работе с электрооборудованием?', answerType: 'YES_NO', required: true, weight: 3, order: 5 },
      { text: 'Оценка состояния электроинфраструктуры (1-5)', answerType: 'SCALE_1_5', required: true, weight: 2, order: 6 },
      { text: 'Замечания по электробезопасности', answerType: 'TEXT', required: false, weight: 0, order: 7 },
    ],
  },
  // ─── 10. Водоочистка и канализация (Water Treatment) ───────────────────
  {
    id: 'tpl-water-treatment',
    title: 'Водоочистка и канализация',
    description: 'Аудит систем водоочистки, контроля качества воды и канализационных стоков на соответствие экологическим нормам.',
    category: 'Санитария',
    questionCount: 6,
    estimatedMinutes: 15,
    difficulty: 'intermediate',
    difficultyLabel: 'Средний',
    icon: Droplets,
    gradientFrom: 'from-violet-500/10',
    gradientTo: 'to-indigo-500/5',
    questions: [
      { text: 'Система водоочистки работает корректно?', answerType: 'YES_NO', required: true, weight: 3, order: 0 },
      { text: 'Канализационные стоки соответствуют нормам?', answerType: 'YES_NO', required: true, weight: 3, order: 1 },
      { text: 'Регулярный лабораторный анализ воды проводится?', answerType: 'YES_NO', required: true, weight: 2, order: 2 },
      { text: 'Питьевая вода соответствует санитарным нормам?', answerType: 'YES_NO', required: true, weight: 2, order: 3 },
      { text: 'Дата последней очистки фильтров водоочистки', answerType: 'DATE', required: true, weight: 2, order: 4 },
      { text: 'Замечания по системам водоснабжения', answerType: 'TEXT', required: false, weight: 0, order: 5 },
    ],
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

// ─── Difficulty Dots Component ────────────────────────────────────────────────

function DifficultyDots({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  const config = DIFFICULTY_CONFIG[difficulty];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i <= config.dots ? config.color : config.inactiveColor
            }`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="w-48 h-6 bg-muted rounded animate-pulse" />
          <div className="w-72 h-4 bg-muted rounded animate-pulse" />
        </div>
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-3">
        <div className="flex-1 h-9 bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-20 h-8 bg-muted rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-muted rounded animate-pulse" />
                <div className="w-full h-3 bg-muted rounded animate-pulse" />
                <div className="w-2/3 h-3 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-16 h-5 bg-muted rounded-full animate-pulse" />
              <div className="w-12 h-5 bg-muted rounded-full animate-pulse" />
              <div className="w-20 h-5 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-8 bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TemplateLibrary({ creatorId }: TemplateLibraryProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Simulate brief loading for shimmer effect
  useState(() => {
    const timer = setTimeout(() => setIsLoaded(true), 600);
    return () => clearTimeout(timer);
  });

  const filtered = useMemo(() => {
    return MARKETPLACE_TEMPLATES.filter((t) => {
      const matchesSearch =
        search === '' ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  const handleUseTemplate = useCallback(async (template: MarketplaceTemplate) => {
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
      toast.success(`Шаблон «${template.title}» импортирован в ваши шаблоны`);
      setPreviewTemplate(null);
    } catch {
      toast.error('Не удалось импортировать шаблон. Попробуйте ещё раз.');
    } finally {
      setCopyingId(null);
    }
  }, [creatorId]);

  if (!isLoaded) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Gradient decoration */}
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Библиотека шаблонов
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Готовые шаблоны для быстрого начала работы
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Search & Filter ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-card border-border/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : 'bg-card text-muted-foreground border-border/50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-700 dark:hover:text-emerald-400'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Template Grid ────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((template) => {
              const Icon = template.icon;
              const catColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Безопасность'];
              const isCopying = copyingId === template.id;

              return (
                <motion.div
                  key={template.id}
                  variants={cardVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="group h-full overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    {/* Top gradient accent */}
                    <div className={`h-1 bg-gradient-to-r ${template.gradientFrom} ${template.gradientTo}`} />

                    <CardContent className="p-4 space-y-3.5">
                      {/* Title & icon */}
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor.bg} border ${catColor.border} transition-transform group-hover:scale-110 duration-300`}>
                          <Icon className={`w-5 h-5 ${catColor.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold leading-tight text-foreground">
                            {template.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${catColor.border} ${catColor.bg} ${catColor.text} gap-1`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
                          {template.category}
                        </Badge>
                        <DifficultyDots difficulty={template.difficulty} />
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span className="font-medium">{template.questionCount} вопросов</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium">~{template.estimatedMinutes} мин</span>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 text-xs h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-500/15"
                          disabled={isCopying}
                          onClick={() => handleUseTemplate(template)}
                        >
                          {isCopying ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Импорт...
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              Использовать
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-8 border-border/50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Просмотр</span>
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
        /* ─── Empty State ─────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-2 -right-2"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Info className="w-3 h-3 text-white" />
              </div>
            </motion.div>
          </div>
          <h3 className="text-base font-semibold text-foreground mt-2">
            Шаблоны не найдены
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
            Попробуйте изменить параметры поиска или выбрать другую категорию
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2 text-xs"
            onClick={() => { setSearch(''); setCategoryFilter('all'); }}
          >
            <X className="w-3.5 h-3.5" />
            Сбросить фильтры
          </Button>
        </motion.div>
      )}

      {/* ─── Preview Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
      >
        {previewTemplate && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
            {/* Dialog header gradient */}
            <div className={`bg-gradient-to-r ${previewTemplate.gradientFrom} ${previewTemplate.gradientTo} px-6 pt-6 pb-4`}>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {(() => {
                    const Icon = previewTemplate.icon;
                    const catColor = CATEGORY_COLORS[previewTemplate.category] || CATEGORY_COLORS['Безопасность'];
                    return (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor.bg} border ${catColor.border}`}>
                        <Icon className={`w-6 h-6 ${catColor.text}`} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-bold leading-tight">
                      {previewTemplate.title}
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 leading-relaxed">
                      {previewTemplate.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {(() => {
                  const catColor = CATEGORY_COLORS[previewTemplate.category] || CATEGORY_COLORS['Безопасность'];
                  return (
                    <Badge
                      variant="outline"
                      className={`text-xs border ${catColor.border} ${catColor.bg} ${catColor.text} gap-1.5`}
                    >
                      <span className={`w-2 h-2 rounded-full ${catColor.dot}`} />
                      {previewTemplate.category}
                    </Badge>
                  );
                })()}
                <Badge variant="outline" className={`text-xs ${DIFFICULTY_CONFIG[previewTemplate.difficulty].badgeBg} ${DIFFICULTY_CONFIG[previewTemplate.difficulty].textColor} border-transparent gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${DIFFICULTY_CONFIG[previewTemplate.difficulty].color}`} />
                  {previewTemplate.difficultyLabel}
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <ClipboardCheck className="w-3 h-3" />
                  {previewTemplate.questionCount} вопросов
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Clock className="w-3 h-3" />
                  ~{previewTemplate.estimatedMinutes} мин
                </Badge>
              </div>
            </div>

            {/* Questions list */}
            <div className="px-6 py-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                Список вопросов
              </h4>
              <ScrollArea className="max-h-[45vh] pr-2">
                <div className="space-y-2">
                  {previewTemplate.questions.map((q, i) => {
                    const atInfo = ANSWER_TYPE_LABELS[q.answerType];
                    return (
                      <motion.div
                        key={q.order}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 ${
                          q.required ? '' : 'opacity-70'
                        }`}
                      >
                        {/* Number */}
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/20">
                          {i + 1}
                        </div>
                        {/* Question text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">
                            {q.text}
                            {q.required && (
                              <span className="text-red-500 ml-0.5">*</span>
                            )}
                          </p>
                        </div>
                        {/* Type badge */}
                        {atInfo && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] flex-shrink-0 border-0 ${atInfo.color} px-1.5 py-0 h-5`}
                          >
                            {atInfo.label}
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Dialog footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/20">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="font-medium">{previewTemplate.questions.filter(q => q.required).length}</span>
                из
                <span className="font-medium">{previewTemplate.questionCount}</span>
                обязательных
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-xs h-9 gap-1.5"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Закрыть
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-9 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-500/15"
                  disabled={copyingId === previewTemplate.id}
                  onClick={() => handleUseTemplate(previewTemplate)}
                >
                  {copyingId === previewTemplate.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Импорт...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Импортировать
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
