'use client';

import { motion } from 'framer-motion';
import {
  BookOpen, Type, Hash, CheckCircle2, BarChart3, ListChecks,
  Camera, Calendar, ClipboardCheck, AlertTriangle, Shield, Zap,
  Award, Target, TrendingDown, Info,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoringGuideProps {
  compact?: boolean;
}

// ─── Score Range Data ────────────────────────────────────────────────────────

const scoreRanges = [
  {
    min: 90,
    max: 100,
    label: 'Отлично',
    description: 'Аудит пройден с высшими результатами. Производственный процесс соответствует всем стандартам.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    icon: Award,
    percentage: 100,
  },
  {
    min: 70,
    max: 89,
    label: 'Хорошо',
    description: 'Аудит пройден успешно. Незначительные отклонения, требующие внимания.',
    color: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    barColor: 'bg-gradient-to-r from-amber-400 to-yellow-400',
    icon: Target,
    percentage: 80,
  },
  {
    min: 50,
    max: 69,
    label: 'Удовлетворительно',
    description: 'Обнаружены существенные отклонения. Необходимы корректирующие мероприятия.',
    color: 'from-orange-400 to-orange-600',
    bgColor: 'bg-gradient-to-r from-orange-50 to-orange-50 dark:from-orange-950/30 dark:to-orange-950/20',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
    barColor: 'bg-gradient-to-r from-orange-400 to-orange-500',
    icon: TrendingDown,
    percentage: 60,
  },
  {
    min: 0,
    max: 49,
    label: 'Критично',
    description: 'Серьёзные нарушения. Требуется немедленное вмешательство и план корректирующих действий.',
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    barColor: 'bg-gradient-to-r from-red-500 to-rose-500',
    icon: AlertTriangle,
    percentage: 30,
  },
];

// ─── Question Types ───────────────────────────────────────────────────────────

const questionTypes = [
  { type: 'TEXT', label: 'Текстовый ответ', description: 'Свободный текстовый комментарий аудитора', icon: Type, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { type: 'NUMBER', label: 'Числовой ответ', description: 'Количественное значение (например, температура)', icon: Hash, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' },
  { type: 'YES_NO', label: 'Да / Нет', description: 'Бинарная оценка соответствия', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' },
  { type: 'SCALE_1_5', label: 'Шкала 1–5', description: 'Оценка от 1 (плохо) до 5 (отлично)', icon: BarChart3, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' },
  { type: 'SCALE_1_10', label: 'Шкала 1–10', description: 'Детальная оценка от 1 до 10 баллов', icon: BarChart3, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' },
  { type: 'MULTIPLE_CHOICE', label: 'Множественный выбор', description: 'Выбор из предопределённых вариантов', icon: ListChecks, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400' },
  { type: 'PHOTO', label: 'Фото-фиксация', description: 'Фотографическое подтверждение', icon: Camera, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400' },
  { type: 'DATE', label: 'Дата', description: 'Указание даты проведения проверки', icon: Calendar, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400' },
  { type: 'CHECKLIST', label: 'Чеклист', description: 'Список пунктов для отметки', icon: ClipboardCheck, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' },
];

// ─── Action Plan Rules ────────────────────────────────────────────────────────

const actionPlanRules = [
  {
    threshold: 'Ниже 70%',
    icon: Shield,
    priority: 'Средний / Высокий',
    priorityColor: 'text-amber-600 dark:text-amber-400',
    deadline: '14–21 дней',
    description: 'Автоматически создаётся план корректирующих действий',
  },
  {
    threshold: 'Ниже 50%',
    icon: AlertTriangle,
    priority: 'Высокий / Критический',
    priorityColor: 'text-red-600 dark:text-red-400',
    deadline: '7–14 дней',
    description: 'Высокий приоритет. Требуется утверждение руководством',
  },
  {
    threshold: 'Ниже 30%',
    icon: Zap,
    priority: 'Критический',
    priorityColor: 'text-red-700 dark:text-red-300 font-bold',
    deadline: '7 дней',
    description: 'Немедленное вмешательство. Остановка производства при необходимости',
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoringGuide({ compact = false }: ScoringGuideProps) {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Справочник оценок</h2>
            <p className="text-sm text-muted-foreground">Как рассчитываются результаты аудитов</p>
          </div>
        </div>
      </motion.div>

      {/* Score Ranges */}
      <motion.div variants={itemVariants} className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Шкала оценок
        </h3>
        <div className="space-y-3">
          {scoreRanges.map((range, i) => {
            const Icon = range.icon;
            return (
              <motion.div
                key={range.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card className={`overflow-hidden border ${range.borderColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${range.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-base font-bold ${range.textColor}`}>{range.label}</span>
                          <Badge variant="outline" className={`text-xs font-mono ${range.borderColor} ${range.textColor}`}>
                            {range.min}–{range.max}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{range.description}</p>
                        {/* Score bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${range.barColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${range.percentage}%` }}
                            transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Question Types */}
      {!compact && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Типы вопросов
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {questionTypes.map((qt, i) => {
              const Icon = qt.icon;
              return (
                <motion.div
                  key={qt.type}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                >
                  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default ${qt.color}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">{qt.label}</div>
                      <div className="text-[10px] opacity-70 leading-tight mt-0.5 truncate">{qt.description}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Action Plan Rules */}
      <motion.div variants={itemVariants} className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Генерация планов действий
        </h3>
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-0 divide-y">
            {actionPlanRules.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <motion.div
                  key={rule.threshold}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                  className={`flex items-center gap-3 py-3 ${i < actionPlanRules.length - 1 ? '' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    i === 2 ? 'bg-red-100 dark:bg-red-900/50' : i === 1 ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
                  }`}>
                    <Icon className={`w-5 h-5 ${rule.priorityColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{rule.threshold}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className={`text-xs font-semibold ${rule.priorityColor}`}>{rule.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {rule.deadline}
                  </Badge>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Tip */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-800/40">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Как это работает</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 leading-relaxed">
              Каждый вопрос имеет вес (по умолчанию 1). Итоговый балл рассчитывается как процент набранных баллов от максимально возможных.
              Результаты ниже 70% автоматически формируют план корректирующих действий с привязкой к ответственному аудитору.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
