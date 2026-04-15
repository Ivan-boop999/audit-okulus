'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  SkipForward,
  Send,
  RotateCcw,
  AlertCircle,
  Camera,
  Calendar,
  X,
  Trophy,
  Sparkles,
  FileText,
  MessageSquare,
  Save,
  Bold,
  Italic,
  List,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditResponseFormProps {
  assignmentId: string;
  userId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface Question {
  id: string;
  text: string;
  answerType: string;
  options?: string | null;
  required: boolean;
  weight: number;
  order: number;
  helpText?: string | null;
}

interface Assignment {
  id: string;
  templateId: string;
  auditorId: string;
  scheduledDate: string;
  dueDate?: string | null;
  status: string;
  notes?: string | null;
  template: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    questions: Question[];
  };
}

interface AnswerEntry {
  questionId: string;
  answer: string;
  comment: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type WizardPhase = 'loading' | 'questions' | 'review' | 'submitting' | 'success';

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

function getScoreColor(score: number): { text: string; bg: string; border: string; label: string } {
  if (score >= 90)
    return {
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      border: 'border-teal-500',
      label: 'Отлично',
    };
  if (score >= 70)
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-500',
      label: 'Хорошо',
    };
  if (score >= 50)
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-500',
      label: 'Удовлетворительно',
    };
  if (score >= 30)
    return {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-500',
      label: 'Ниже среднего',
    };
  return {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-500',
    label: 'Критично',
  };
}

function getAnswerTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    YES_NO: 'Да / Нет',
    SCALE_1_5: 'Шкала 1–5',
    SCALE_1_10: 'Шкала 1–10',
    SCALE_1_100: 'Шкала 1–100',
    MULTIPLE_CHOICE: 'Выбор',
    PHOTO: 'Фото',
    DATE: 'Дата',
    CHECKLIST: 'Чек-лист',
  };
  return map[type] || type;
}

function getScaleColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.8) return 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500';
  if (ratio >= 0.6) return 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500';
  if (ratio >= 0.4) return 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500';
  if (ratio >= 0.2) return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500';
  return 'bg-red-500 hover:bg-red-600 text-white border-red-500';
}

function getScaleColorInactive(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.8) return 'border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30';
  if (ratio >= 0.6) return 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30';
  if (ratio >= 0.4) return 'border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30';
  if (ratio >= 0.2) return 'border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30';
  return 'border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30';
}

// ─── Markdown-like Renderer ──────────────────────────────────────────────────

function renderFormattedNotes(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { key: number; content: string }[] = [];
  let blockIdx = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`ul-${blockIdx}`} className="list-disc list-inside space-y-0.5 mb-2">
          {currentList.map((item) => (
            <li key={item.key}>{renderInlineFormatting(item.content)}</li>
          ))}
        </ul>
      );
      blockIdx++;
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('- ')) {
      currentList.push({ key: i, content: line.slice(2) });
      continue;
    }

    // Flush any pending list
    flushList();

    if (line.trim() === '') {
      blocks.push(<br key={`br-${i}`} />);
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="mb-1">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  // Flush final list
  flushList();

  return <>{blocks}</>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Process bold (**text**) and italic (*text*) in a single pass
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    // Italic: *text* (but not **)
    const italicMatch = !boldMatch ? remaining.match(/^(.*?)\*([^*]+?)\*(?!\*)/) : null;

    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={`b-${keyIdx++}`}>{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
    } else if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={`i-${keyIdx++}`}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}

// ─── Confetti Particles ───────────────────────────────────────────────────────

function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2.5 h-2.5 rounded-sm"
      style={{
        left: `${x}%`,
        top: '-10px',
        backgroundColor: color,
      }}
      initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: [0, 150, 350],
        opacity: [1, 1, 0],
        rotate: [0, 180, 540],
        scale: [1, 1.2, 0.5],
        x: [0, (x - 50) * 1.5],
      }}
      transition={{
        duration: 2.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

const CONFETTI_COLORS = ['#059669', '#0d9488', '#0891b2', '#d97706', '#7c3aed', '#e11d48', '#2563eb'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditResponseForm({
  assignmentId,
  userId,
  onComplete,
  onCancel,
}: AuditResponseFormProps) {
  // ── State ──────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<WizardPhase>('loading');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = forward, -1 = backward
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [checklistState, setChecklistState] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // ── Notes textarea ref ────────────────────────────────────────────────────

  const notesRef = useRef<HTMLTextAreaElement>(null);

  // ── Formatting toolbar handlers ────────────────────────────────────────────

  const insertAtCursor = useCallback((before: string, after: string) => {
    const textarea = notesRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const replacement = `${before}${selected || 'текст'}${after}`;

    const newValue = value.slice(0, start) + replacement + value.slice(end);
    setNotes(newValue);

    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start, start + replacement.length);
      } else {
        // Select the placeholder text
        textarea.setSelectionRange(start + before.length, start + before.length + 5);
      }
    });
  }, []);

  const handleBold = useCallback(() => insertAtCursor('**', '**'), [insertAtCursor]);
  const handleItalic = useCallback(() => insertAtCursor('*', '*'), [insertAtCursor]);
  const handleList = useCallback(() => {
    const textarea = notesRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const value = textarea.value;
    const insert = '- Элемент списка';
    const newValue = value.slice(0, start) + '\n' + insert + value.slice(start);
    setNotes(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1 + 2, start + 1 + 2 + 13);
    });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const questions = useMemo(() => {
    if (!assignment?.template?.questions) return [];
    return [...assignment.template.questions].sort((a, b) => a.order - b.order);
  }, [assignment]);

  const totalSteps = questions.length + 1; // +1 for review step
  const currentQuestion = currentStep < questions.length ? questions[currentStep] : null;
  const isReviewStep = currentStep >= questions.length;
  const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const answeredCount = questions.filter((q) => {
    if (q.answerType === 'CHECKLIST') {
      return (checklistState[q.id]?.length ?? 0) > 0;
    }
    return !!answers[q.id];
  }).length;

  // ── Fetch assignment ───────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchAssignment() {
      try {
        const res = await fetch(`/api/assignments?userId=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch assignment');
        const data: Assignment[] = await res.json();
        const found = data.find((a) => a.id === assignmentId);
        if (!found) {
          setError('Задание не найдено');
          return;
        }
        if (!found.template?.questions?.length) {
          setError('Шаблон аудита не содержит вопросов');
          return;
        }
        setAssignment(found);
        setPhase('questions');

        // Check for existing draft
        try {
          const draftKey = `auditpro-draft-${assignmentId}`;
          const draftStr = localStorage.getItem(draftKey);
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            if (draft && draft.answers && Object.keys(draft.answers).length > 0) {
              setRestoreDialogOpen(true);
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Fetch assignment error:', err);
        setError('Ошибка загрузки задания');
      }
    }
    fetchAssignment();
  }, [assignmentId, userId]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goStep = useCallback(
    (step: number) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const skipQuestion = useCallback(() => {
    goNext();
  }, [goNext]);

  // ── Answer handlers ────────────────────────────────────────────────────────

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const setComment = useCallback((questionId: string, value: string) => {
    setComments((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleChecklistItem = useCallback((questionId: string, option: string) => {
    setChecklistState((prev) => {
      const current = prev[questionId] || [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      // Also update the answers record for display purposes
      setAnswers((a) => ({ ...a, [questionId]: JSON.stringify(next) }));
      return { ...prev, [questionId]: next };
    });
  }, []);

  // ── Validate current question ──────────────────────────────────────────────

  const canProceed = useMemo(() => {
    if (isReviewStep || !currentQuestion) return true;
    if (!currentQuestion.required) return true;

    const ans = answers[currentQuestion.id];
    if (currentQuestion.answerType === 'CHECKLIST') {
      return (checklistState[currentQuestion.id]?.length ?? 0) > 0;
    }
    return !!ans;
  }, [isReviewStep, currentQuestion, answers, checklistState]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // Validate all required questions have answers
    const missing = questions.filter((q) => {
      if (!q.required) return false;
      if (q.answerType === 'CHECKLIST') {
        return (checklistState[q.id]?.length ?? 0) === 0;
      }
      return !answers[q.id];
    });

    if (missing.length > 0) {
      toast.error(`${missing.length} обязательных ${missing.length === 1 ? 'вопрос' : missing.length < 5 ? 'вопроса' : 'вопросов'} без ответа`, {
        description: 'Пожалуйста, ответьте на все обязательные вопросы или пропустите (если разрешено)',
      });
      // Navigate to first missing question
      const firstMissingIdx = questions.findIndex((q) => q.id === missing[0].id);
      if (firstMissingIdx >= 0) {
        goStep(firstMissingIdx);
      }
      return;
    }

    setSubmitting(true);
    setPhase('submitting');

    try {
      const answerEntries: AnswerEntry[] = questions.map((q) => ({
        questionId: q.id,
        answer: q.answerType === 'CHECKLIST'
          ? JSON.stringify(checklistState[q.id] || [])
          : answers[q.id] || '',
        comment: comments[q.id] || '',
      }));

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          auditorId: userId,
          answers: answerEntries,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ошибка при отправке');
      }

      const responseData = await res.json();
      setPhase('success');
      toast.success('Аудит успешно завершён!');
      onComplete?.();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Ошибка отправки', {
        description: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      });
      setPhase('review');
    } finally {
      setSubmitting(false);
    }
  }, [questions, answers, comments, checklistState, notes, assignmentId, userId, onComplete, goStep]);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    setCancelOpen(false);
    onCancel?.();
  }, [onCancel]);

  // ── Draft Save / Restore ──────────────────────────────────────────────────

  const draftKey = `auditpro-draft-${assignmentId}`;

  const handleSaveDraft = useCallback(() => {
    try {
      const draft = {
        answers,
        comments,
        notes,
        checklistState,
        currentStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      toast.success('Черновик сохранён', {
        description: `${answeredCount} из ${questions.length} ответов сохранено локально`,
      });
    } catch {
      toast.error('Не удалось сохранить черновик');
    }
  }, [answers, comments, notes, checklistState, currentStep, answeredCount, questions.length]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const draftStr = localStorage.getItem(draftKey);
      if (!draftStr) return;
      const draft = JSON.parse(draftStr);
      if (draft.answers) setAnswers(draft.answers);
      if (draft.comments) setComments(draft.comments);
      if (draft.notes) setNotes(draft.notes);
      if (draft.checklistState) setChecklistState(draft.checklistState);
      if (typeof draft.currentStep === 'number') setCurrentStep(draft.currentStep);
      setDraftRestored(true);
      setRestoreDialogOpen(false);
      toast.success('Черновик восстановлен');
    } catch {
      toast.error('Не удалось восстановить черновик');
    }
  }, [draftKey]);

  const handleDiscardDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setRestoreDialogOpen(false);
  }, [draftKey]);

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (phase === 'loading' && !error) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <CardContent className="p-12 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-500"
            />
            <p className="text-muted-foreground text-sm">Загрузка задания...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Draft Restore Dialog ──────────────────────────────────────────────────

  if (restoreDialogOpen) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Save className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Найден черновик</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Обнаружены ранее сохранённые ответы для этого аудита. Хотите восстановить?
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRestoreDraft} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Восстановить
              </Button>
              <Button variant="outline" onClick={handleDiscardDraft} className="gap-2">
                Начать заново
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="overflow-hidden border-red-200 dark:border-red-900/50">
          <CardContent className="p-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={onCancel}>
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Success ────────────────────────────────────────────────────────

  if (phase === 'success' && assignment) {
    // We'll show a success screen — the score will be derived from what the API returns
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="overflow-hidden relative">
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {CONFETTI_COLORS.map((color, i) => (
              <ConfettiParticle
                key={i}
                color={color}
                delay={i * 0.12}
                x={8 + (i * 84) / CONFETTI_COLORS.length}
              />
            ))}
          </div>

          <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center gap-6">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
                >
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.8 }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-foreground">Аудит завершён!</h2>
              <p className="text-muted-foreground mt-2">
                {assignment.template.title}
              </p>
            </motion.div>

            {/* Score display (decorative — real score comes from API) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
              className="w-full max-w-xs"
            >
              <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">Результат</span>
                </div>
                <motion.div
                  className="text-5xl font-bold text-emerald-600 dark:text-emerald-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  ✨
                </motion.div>
                <p className="text-sm text-muted-foreground mt-2">
                  Все ответы успешно сохранены
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button onClick={onComplete} className="gap-2">
                <FileText className="w-4 h-4" />
                Перейти к результатам
              </Button>
              <Button variant="outline" onClick={onCancel} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Вернуться
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Review ─────────────────────────────────────────────────────────

  if (isReviewStep) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          {/* Progress */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Обзор ответов</span>
              <span className="text-xs font-medium text-muted-foreground">{answeredCount}/{questions.length} отвечено</span>
            </div>
            <Progress value={100} className="h-2 [&>div]:bg-emerald-500" />
          </div>

          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              Проверка перед отправкой
            </CardTitle>
            <CardDescription>
              Проверьте ваши ответы перед завершением аудита «{assignment?.template.title}»
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</div>
                <div className="text-xs text-muted-foreground">Отвечено</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {questions.length - answeredCount}
                </div>
                <div className="text-xs text-muted-foreground">Без ответа</div>
              </div>
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3 text-center">
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {comments && Object.values(comments).filter(Boolean).length}
                </div>
                <div className="text-xs text-muted-foreground">Комментариев</div>
              </div>
            </div>

            {/* Missing required questions warning */}
            {questions.some((q) => q.required && !answers[q.id] && !(checklistState[q.id]?.length)) && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Не все обязательные вопросы отвечены
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                    Вы можете вернуться и заполнить пропущенные вопросы
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Answers list */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const hasAnswer = q.answerType === 'CHECKLIST'
                    ? (checklistState[q.id]?.length ?? 0) > 0
                    : !!answers[q.id];
                  const ans = q.answerType === 'CHECKLIST'
                    ? checklistState[q.id]?.join(', ') || '—'
                    : answers[q.id] || '—';

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="rounded-lg border bg-card p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span className="text-sm font-medium leading-snug">{q.text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {q.required && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-500">
                              Обяз.
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {getAnswerTypeLabel(q.answerType)}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-5 pl-3 border-l-2 border-muted">
                        <p className={`text-sm ${hasAnswer ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                          {ans}
                        </p>
                        {comments[q.id] && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                            {comments[q.id]}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Additional notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                Дополнительные заметки (необязательно)
              </Label>
              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleBold}
                  title="Жирный (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleItalic}
                  title="Курсив (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleList}
                  title="Список"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground px-1">
                  Поддерживается: **жирный**, *курсив*, - список
                </span>
              </div>
              <Textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Общие замечания по аудиту... Используйте ** для жирного, * для курсива, - для списка"
                className="min-h-[80px] resize-none"
              />
              {/* Formatted preview */}
              {notes.trim() && (
                <div className="rounded-lg border bg-muted/20 p-3 mt-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
                    Предпросмотр
                  </div>
                  <div className="text-sm text-foreground leading-relaxed">
                    {renderFormattedNotes(notes)}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={goPrev}
                variant="outline"
                className="gap-2 flex-1 sm:flex-none h-11"
                disabled={submitting}
              >
                <ChevronLeft className="w-4 h-4" />
                Вернуться к вопросам
              </Button>

              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground h-11"
                onClick={handleSaveDraft}
              >
                <Save className="w-4 h-4" />
                Сохранить черновик
              </Button>

              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-muted-foreground h-11" disabled={submitting}>
                    <X className="w-4 h-4" />
                    Отменить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Отменить аудит?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Все введённые ответы будут потеряны. Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Продолжить аудит</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Отменить всё
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={submitting}
                    className="gap-2 flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                  >
                    {submitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Завершить
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Подтвердить отправку?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>
                          Вы ответили на <span className="font-bold text-foreground">{answeredCount}</span> из{' '}
                          <span className="font-bold text-foreground">{questions.length}</span> вопросов.
                        </p>
                        {questions.length - answeredCount > 0 && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              ⚠️ {questions.length - answeredCount} вопросов без ответа
                            </p>
                          </div>
                        )}
                        <p className="text-muted-foreground">
                          После отправки результаты будут сохранены и доступны для просмотра.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Вернуться к аудиту</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Отправить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Question Step ──────────────────────────────────────────────────

  if (!currentQuestion || !assignment) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="overflow-hidden">
        {/* Progress bar */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Вопрос {currentStep + 1} из {questions.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {answeredCount} отвечено
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
          <Progress
            value={progressPercent}
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500"
          />
          {/* Step indicators */}
          <div className="flex gap-1.5 sm:gap-1.5 mt-2 flex-wrap">
            {questions.map((q, idx) => {
              const isAnswered = q.answerType === 'CHECKLIST'
                ? (checklistState[q.id]?.length ?? 0) > 0
                : !!answers[q.id];
              const isCurrent = idx === currentStep;

              return (
                <button
                  key={q.id}
                  onClick={() => goStep(idx)}
                  className={`
                    w-7 h-7 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-[10px] font-bold transition-all duration-200
                    ${isCurrent
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/30 scale-110'
                      : isAnswered
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                  title={`${idx + 1}. ${q.text.slice(0, 40)}...`}
                >
                  {isAnswered && !isCurrent ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <CardContent className="pt-4 pb-6 min-h-[380px] sm:min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col flex-1"
            >
              {/* Question header */}
              <div className="mb-6">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-base sm:text-lg font-bold text-emerald-500 shrink-0">{currentStep + 1}.</span>
                  <h3 className="text-base sm:text-lg font-semibold leading-snug">{currentQuestion.text}</h3>
                  {currentQuestion.required && (
                    <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-red-300 text-red-500 mt-0.5">
                      Обяз.
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-7 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {getAnswerTypeLabel(currentQuestion.answerType)}
                  </Badge>
                  {currentQuestion.helpText && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {currentQuestion.helpText}
                    </span>
                  )}
                </div>
              </div>

              {/* Answer input area */}
              <div className="flex-1">
                <AnswerInput
                  question={currentQuestion}
                  value={answers[currentQuestion.id] || ''}
                  checklistItems={checklistState[currentQuestion.id] || []}
                  onAnswerChange={(val) => setAnswer(currentQuestion.id, val)}
                  onChecklistToggle={(opt) => toggleChecklistItem(currentQuestion.id, opt)}
                />
              </div>

              {/* Comment field */}
              <div className="mt-6 space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Комментарий (необязательно)
                </Label>
                <Textarea
                  value={comments[currentQuestion.id] || ''}
                  onChange={(e) => setComment(currentQuestion.id, e.target.value)}
                  placeholder="Добавьте пояснение к вашему ответу..."
                  className="min-h-[80px] sm:min-h-[100px] resize-none text-sm"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <Separator className="my-4" />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-1.5 h-11 min-w-[88px] flex-1 sm:flex-none"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </Button>

              {!currentQuestion.required && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipQuestion}
                  className="gap-1.5 text-muted-foreground h-11 min-w-[100px] flex-1 sm:flex-none"
                >
                  <SkipForward className="w-4 h-4" />
                  Пропустить
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-11 min-w-[44px] flex-1 sm:flex-none"
                onClick={handleSaveDraft}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Черновик</span>
              </Button>

              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground h-11 min-w-[44px] flex-1 sm:flex-none"
                  >
                    <X className="w-4 h-4" />
                    Отменить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Отменить аудит?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Все введённые ответы будут потеряны. Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Продолжить аудит</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Отменить всё
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {currentStep < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={goNext}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-11 min-w-[88px] flex-1 sm:flex-none"
                >
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={goNext}
                  className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white h-11 min-w-[88px] flex-1 sm:flex-none"
                >
                  <Check className="w-4 h-4" />
                  Обзор
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Answer Input Component ───────────────────────────────────────────────────

function AnswerInput({
  question,
  value,
  checklistItems,
  onAnswerChange,
  onChecklistToggle,
}: {
  question: Question;
  value: string;
  checklistItems: string[];
  onAnswerChange: (value: string) => void;
  onChecklistToggle: (option: string) => void;
}) {
  switch (question.answerType) {
    case 'TEXT':
      return (
        <Textarea
          value={value}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Введите ваш ответ..."
          className="min-h-[120px] sm:min-h-[140px] resize-none text-base"
        />
      );

    case 'NUMBER':
      return (
        <div className="max-w-xs">
          <div className="relative">
            <Input
              type="number"
              value={value}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Введите число"
              className="text-lg h-12 pl-4 pr-12 w-full"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button type="button" onClick={() => onAnswerChange(String((parseInt(value) || 0) + 1))} className="w-8 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
              <button type="button" onClick={() => onAnswerChange(String(Math.max(0, (parseInt(value) || 0) - 1)))} className="w-8 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <ChevronRight className="w-3 h-3 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      );

    case 'YES_NO':
      return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnswerChange('yes')}
            className={`
              flex items-center justify-center gap-3 rounded-xl border-2 px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg font-bold transition-all duration-200
              ${value === 'yes'
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }
            `}
          >
            <Check className="w-6 h-6" />
            Да
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnswerChange('no')}
            className={`
              flex items-center justify-center gap-3 rounded-xl border-2 px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg font-bold transition-all duration-200
              ${value === 'no'
                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                : 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
              }
            `}
          >
            <X className="w-6 h-6" />
            Нет
          </motion.button>
        </div>
      );

    case 'SCALE_1_5':
      return (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((num) => (
            <motion.button
              key={num}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAnswerChange(String(num))}
              className={`
                w-12 h-12 sm:w-12 sm:h-12 rounded-xl border-2 text-base sm:text-lg font-bold transition-all duration-200
                ${value === String(num)
                  ? getScaleColor(num, 5)
                  : `${getScaleColorInactive(num, 5)} border`
                }
              `}
            >
              {num}
            </motion.button>
          ))}
          <div className="flex items-center gap-2 ml-3">
            <span className="text-xs text-muted-foreground">Выбрано:</span>
            <span className={`text-lg font-bold ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
              {value || '—'}
            </span>
          </div>
        </div>
      );

    case 'SCALE_1_10':
      return (
        <div>
          <div className="flex gap-1.5 sm:gap-1.5 flex-wrap max-w-lg">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAnswerChange(String(num))}
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 text-sm font-bold transition-all duration-200
                  ${value === String(num)
                    ? getScaleColor(num, 10)
                    : `${getScaleColorInactive(num, 10)} border`
                  }
                `}
              >
                {num}
              </motion.button>
            ))}
          </div>
          {value && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground mt-2"
            >
              Оценка: <span className="font-bold text-foreground">{value}</span> из 10
            </motion.p>
          )}
        </div>
      );

    case 'SCALE_1_100': {
      const numVal = parseInt(value) || 0;
      return (
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">1</span>
            <span className={`text-2xl font-bold ${numVal ? 'text-foreground' : 'text-muted-foreground'}`}>
              {value || '—'}
            </span>
            <span className="text-sm text-muted-foreground">100</span>
          </div>
          <Slider
            value={[numVal]}
            onValueChange={([val]) => onAnswerChange(String(val))}
            min={1}
            max={100}
            step={1}
            className="[&>div>div]:bg-gradient-to-r [&>div>div]:from-red-500 [&>div>div]:via-amber-500 [&>div>div]:to-emerald-500"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => {
                const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                onAnswerChange(String(v));
              }}
              placeholder="1-100"
              className="w-24 text-center"
              min={1}
              max={100}
            />
          </div>
        </div>
      );
    }

    case 'MULTIPLE_CHOICE': {
      let options: string[] = [];
      try {
        options = question.options ? JSON.parse(question.options) : [];
      } catch {
        options = question.options?.split(',').map((o) => o.trim()).filter(Boolean) || [];
      }
      return (
        <RadioGroup
          value={value}
          onValueChange={onAnswerChange}
          className="space-y-2"
        >
          {options.map((option, idx) => (
            <motion.label
              key={idx}
              htmlFor={`mc-${question.id}-${idx}`}
              whileHover={{ x: 4 }}
              className={`
                flex items-center gap-3 rounded-lg border p-4 min-h-[48px] cursor-pointer transition-all duration-200
                ${value === option
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
                  : 'border-muted hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-muted/50'
                }
              `}
            >
              <RadioGroupItem value={option} id={`mc-${question.id}-${idx}`} />
              <span className="text-sm font-medium leading-snug">{option}</span>
            </motion.label>
          ))}
        </RadioGroup>
      );
    }

    case 'PHOTO':
      return (
        <div>
          <motion.label
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 sm:p-8 cursor-pointer transition-all duration-200
              ${value
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-muted hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-muted/30'
              }
            `}
          >
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-colors
              ${value
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-muted'
              }
            `}>
              <Camera className={`w-7 h-7 ${value ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
            <span className={`text-sm font-medium ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {value ? '📷 Фото прикреплено' : '📷 Прикрепить фото'}
            </span>
            <span className="text-xs text-muted-foreground">
              {value ? 'Нажмите, чтобы заменить' : 'Нажмите для выбора файла'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onAnswerChange(`photo:${file.name}`);
                }
              }}
            />
          </motion.label>
          {value && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              {value.replace('photo:', '')}
            </p>
          )}
        </div>
      );

    case 'DATE':
      return (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={value}
              onChange={(e) => onAnswerChange(e.target.value)}
              className="pl-10 text-base h-12 w-full sm:w-auto"
            />
          </div>
          {value && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-muted-foreground"
            >
              {new Date(value).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </motion.span>
          )}
        </div>
      );

    case 'CHECKLIST': {
      let options: string[] = [];
      try {
        options = question.options ? JSON.parse(question.options) : [];
      } catch {
        options = question.options?.split(',').map((o) => o.trim()).filter(Boolean) || [];
      }
      return (
        <div className="space-y-2">
          {options.map((option, idx) => {
            const isChecked = checklistItems.includes(option);
            return (
              <motion.label
                key={idx}
                htmlFor={`cl-${question.id}-${idx}`}
                whileHover={{ x: 4 }}
                className={`
                  flex items-center gap-3 rounded-lg border p-4 min-h-[48px] cursor-pointer transition-all duration-200
                  ${isChecked
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-muted hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-muted/50'
                  }
                `}
              >
                <Checkbox
                  id={`cl-${question.id}-${idx}`}
                  checked={isChecked}
                  onCheckedChange={() => onChecklistToggle(option)}
                />
                <span className={`text-sm font-medium leading-snug ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {option}
                </span>
                {isChecked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto"
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                )}
              </motion.label>
            );
          })}
          {checklistItems.length > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Выбрано: {checklistItems.length} из {options.length}
            </p>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Неизвестный тип вопроса: {question.answerType}</span>
        </div>
      );
  }
}
