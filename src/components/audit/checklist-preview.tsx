'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer, X, Loader2, FileText, ListChecks, Tag, Weight,
  HelpCircle, Star, AlertCircle, Clock,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TemplateData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  status: string;
  questions?: TemplateQuestion[];
  _count?: { assignments?: number; questions?: number };
}

interface ChecklistPreviewProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANSWER_TYPE_LABELS: Record<AnswerType, string> = {
  YES_NO: 'Да / Нет',
  SCALE_1_5: 'Оценка 1-5',
  SCALE_1_10: 'Оценка 1-10',
  SCALE_1_100: 'Оценка 1-100',
  TEXT: 'Текстовый ответ',
  NUMBER: 'Числовой ответ',
  MULTIPLE_CHOICE: 'Множественный выбор',
  DATE: 'Дата',
  PHOTO: 'Фото',
  CHECKLIST: 'Чек-лист',
};

const ANSWER_TYPE_COLORS: Record<AnswerType, string> = {
  TEXT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  NUMBER: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  YES_NO: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  SCALE_1_5: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800',
  SCALE_1_10: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:rose-rose-300 dark:border-rose-800',
  SCALE_1_100: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  MULTIPLE_CHOICE: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
  PHOTO: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800',
  DATE: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  CHECKLIST: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Безопасность труда': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  'Качество продукции': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  'Техническое обслуживание': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  'Охрана окружающей среды': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
  'Санитарные условия': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800',
  'Пожарная безопасность': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  'Электробезопасность': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
  'Логистика и склад': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800',
  'Документация': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  'Обучение персонала': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800',
  'Другое': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-800',
};

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  YEARLY: 'Ежегодно',
  ONCE: 'Одноразово',
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const questionVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.15 + i * 0.04,
      duration: 0.35,
      ease: 'easeOut',
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChecklistPreview({ templateId, open, onOpenChange }: ChecklistPreviewProps) {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/templates?templateId=${templateId}`);
      if (!res.ok) throw new Error('Не удалось загрузить шаблон');
      const data = await res.json();
      setTemplate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (open && templateId) {
      fetchTemplate();
    }
  }, [open, templateId, fetchTemplate]);

  const handlePrint = () => {
    window.print();
  };

  const questions = template?.questions || [];
  const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);
  const catColor = CATEGORY_COLORS[template?.category || ''] || CATEGORY_COLORS['Другое'];
  const freqLabel = FREQUENCY_LABELS[template?.frequency || ''] || template?.frequency || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white flex-shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/20 rounded-full blur-[60px] pointer-events-none" />

          {loading ? (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-6 w-64 rounded shimmer-white" />
                <div className="h-8 w-8 rounded-full bg-white/10" />
              </div>
              <div className="h-4 w-48 rounded shimmer-white" />
            </div>
          ) : error ? (
            <div className="relative z-10 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-300" />
              <span className="text-sm text-red-200">{error}</span>
            </div>
          ) : template ? (
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <DialogHeader className="space-y-0 p-0">
                      <DialogTitle className="text-lg font-bold text-white leading-tight truncate">
                        {template.title}
                      </DialogTitle>
                      <DialogDescription className="text-emerald-100/70 text-xs mt-0.5">
                        Предпросмотр чек-листа шаблона
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${catColor} border text-[11px]`}>
                      <Tag className="w-3 h-3 mr-1" />
                      {template.category}
                    </Badge>
                    {freqLabel && (
                      <Badge className="bg-white/15 text-white border-white/20 text-[11px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {freqLabel}
                      </Badge>
                    )}
                    <Badge className="bg-white/15 text-white border-white/20 text-[11px]">
                      <ListChecks className="w-3 h-3 mr-1" />
                      {questions.length} {questions.length === 1 ? 'вопрос' : questions.length < 5 ? 'вопроса' : 'вопросов'}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15 flex-shrink-0"
                  onClick={handlePrint}
                  title="Печать"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ─── Content ─────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {loading ? (
              /* ─── Loading Skeleton ──────────────────────────────────── */
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2.5 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-[70%] rounded" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              /* ─── Error State ───────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTemplate} className="gap-2">
                  <Loader2 className="w-3.5 h-3.5" />
                  Повторить
                </Button>
              </div>
            ) : questions.length === 0 ? (
              /* ─── Empty Questions ───────────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <ListChecks className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Нет вопросов</p>
                <p className="text-xs text-muted-foreground">В этом шаблоне пока нет вопросов</p>
              </div>
            ) : (
              /* ─── Questions List ────────────────────────────────────── */
              <div className="space-y-2">
                {/* Summary bar */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                  className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/50 border mb-3 text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Всего вопросов: <strong className="text-foreground">{questions.length}</strong>
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5" />
                    Суммарный вес: <strong className="text-foreground">{totalWeight}</strong>
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    Обязательных: <strong className="text-foreground">{questions.filter(q => q.required).length}</strong>
                  </span>
                </motion.div>

                {/* Questions */}
                <AnimatePresence>
                  {questions.map((question, index) => {
                    const typeLabel = ANSWER_TYPE_LABELS[question.answerType] || question.answerType;
                    const typeColor = ANSWER_TYPE_COLORS[question.answerType] || ANSWER_TYPE_COLORS.TEXT;

                    return (
                      <motion.div
                        key={question.id || index}
                        custom={index}
                        variants={questionVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                        className="group relative rounded-lg border bg-card hover:shadow-sm transition-all duration-200 overflow-hidden"
                      >
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-emerald-400 to-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />

                        <div className="pl-4 pr-3 py-3">
                          {/* Question number and text */}
                          <div className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-relaxed">
                                  {question.text}
                                  {question.required && (
                                    <span className="text-red-500 ml-0.5">*</span>
                                  )}
                                </p>
                              </div>

                              {/* Meta row */}
                              <div className="flex items-center gap-2 flex-wrap mt-2">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor}`}>
                                  {typeLabel}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Weight className="w-2.5 h-2.5" />
                                  Вес: {question.weight}
                                </span>
                                {question.required && (
                                  <span className="text-[10px] text-red-500 flex items-center gap-1">
                                    Обязательный
                                  </span>
                                )}
                                {question.helpText && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 max-w-[200px] truncate" title={question.helpText}>
                                    <HelpCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                    {question.helpText}
                                  </span>
                                )}
                                {question.options && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 max-w-[200px] truncate" title={question.options}>
                                    <ListChecks className="w-2.5 h-2.5 flex-shrink-0" />
                                    {question.options}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        {!loading && !error && template && questions.length > 0 && (
          <div className="flex-shrink-0 border-t px-6 py-3 bg-muted/30 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Шаблон: {template.title} • {questions.length} вопросов
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Печать
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
