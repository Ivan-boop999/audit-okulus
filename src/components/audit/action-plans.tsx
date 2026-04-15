'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight, Flame, TrendingUp,
  Target, ListTodo, Filter, ChevronDown, Plus, CircleDot, CircleCheck,
  CircleAlert, Shield, Zap, Trash2, Trophy,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionPlansProps {
  isAdmin?: boolean;
  userId?: string;
}

type Priority = 'critical' | 'high' | 'medium' | 'low';
type ActionStatus = 'new' | 'in_progress' | 'done' | 'overdue';

interface ActionPlanRecord {
  id: string;
  auditResponseId?: string | null;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  sourceType: string;
  sourceId?: string | null;
  score?: number | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; email?: string; department?: string } | null;
  auditResponse?: {
    id: string;
    score?: number | null;
    status: string;
    assignment?: {
      id: string;
      template?: { id: string; title: string; category: string } | null;
      auditor?: { id: string; name: string } | null;
    } | null;
  } | null;
}

interface ActionItem {
  id: string;
  dbId: string;
  priority: Priority;
  title: string;
  description: string;
  relatedAudit: string;
  relatedTemplate: string;
  relatedCategory: string;
  auditScore: number;
  dueDate: string;
  createdAt: string;
  status: ActionStatus;
  assignee: string;
  assigneeId: string;
}

interface AuditResponse {
  id: string;
  assignmentId: string;
  auditorId: string;
  score: number;
  maxScore: number;
  status: string;
  notes?: string;
  completedAt?: string;
  assignment?: {
    id: string;
    template?: {
      id: string;
      title: string;
      category: string;
    };
    auditor?: {
      id: string;
      name: string;
    };
  };
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconBg: string;
  barColor: string;
  daysToDue: number;
}> = {
  critical: {
    label: 'Критический',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-l-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/60',
    barColor: '#ef4444',
    daysToDue: 7,
  },
  high: {
    label: 'Высокий',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    borderColor: 'border-l-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/60',
    barColor: '#f97316',
    daysToDue: 14,
  },
  medium: {
    label: 'Средний',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-l-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60',
    barColor: '#f59e0b',
    daysToDue: 21,
  },
  low: {
    label: 'Низкий',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-l-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    barColor: '#10b981',
    daysToDue: 21,
  },
};

const STATUS_CONFIG: Record<ActionStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  dotColor: string;
}> = {
  new: {
    label: 'Новое',
    icon: CircleAlert,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dotColor: 'bg-slate-400',
  },
  in_progress: {
    label: 'В работе',
    icon: CircleDot,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  done: {
    label: 'Выполнено',
    icon: CircleCheck,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  overdue: {
    label: 'Просрочено',
    icon: CircleAlert,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getPriority(score: number): Priority {
  if (score < 30) return 'critical';
  if (score < 50) return 'high';
  if (score < 70) return 'medium';
  return 'low';
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dueDate: string, status: ActionStatus): boolean {
  if (status === 'done') return false;
  return new Date(dueDate) < new Date();
}

function getDueDateStyle(dueDate: string, status: ActionStatus): { color: string; label: string } {
  if (status === 'done') return { color: 'text-emerald-600 dark:text-emerald-400', label: '' };
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { color: 'text-red-600 dark:text-red-400 font-semibold', label: '(просрочено)' };
  if (diffDays <= 3) return { color: 'text-amber-600 dark:text-amber-400', label: '' };
  return { color: 'text-emerald-600 dark:text-emerald-400', label: '' };
}

function getWelcomeData(stats: { total: number; critical: number; inProgress: number; completed: number; overdue: number }) {
  if (stats.total === 0) {
    return { message: 'Все аудиты проходят успешно!', sub: 'Корректирующие действия не требуются', icon: Trophy, gradient: 'from-emerald-500 to-teal-500', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' };
  }
  if (stats.overdue > 0 || stats.critical > 0) {
    return { message: 'Требует внимания', sub: `${stats.overdue} просрочено, ${stats.critical} критических`, icon: AlertTriangle, gradient: 'from-red-500 to-orange-500', badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' };
  }
  if (stats.inProgress > 0) {
    return { message: 'Работа в процессе', sub: `${stats.inProgress} действий выполняется`, icon: Clock, gradient: 'from-amber-500 to-orange-500', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' };
  }
  return { message: 'Всё под контролем!', sub: `${stats.completed} из ${stats.total} выполнено`, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' };
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    transition: { duration: 0.25 },
  },
};

const cardHover = {
  rest: { y: 0, boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
  hover: {
    y: -2,
    boxShadow: '0 8px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -6px rgba(0,0,0,0.08)',
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; fill: string }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const labels: Record<string, string> = {
    critical: 'Критический',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  };
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
        <span className="font-medium text-foreground">{labels[item.dataKey] || item.dataKey}</span>
      </div>
      <p className="text-muted-foreground text-xs mt-0.5">{item.value} действий</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Illustration */}
      <div className="relative mb-8">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-cyan-950/60 flex items-center justify-center shadow-lg shadow-emerald-500/10"
        >
          <Shield className="w-14 h-14 text-emerald-500" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute -bottom-1 -left-3 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shadow-md"
        >
          <Zap className="w-3.5 h-3.5 text-white" />
        </motion.div>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">
        {hasFilters ? 'Ничего не найдено' : 'Всё отлично!'}
      </h3>
      <p className="text-muted-foreground text-sm text-center max-w-md leading-relaxed">
        {hasFilters
          ? 'Попробуйте изменить параметры фильтрации для отображения корректирующих действий.'
          : 'Все завершённые аудиты соответствуют требуемым стандартам. Корректирующие действия не требуются.'}
      </p>

      {!hasFilters && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-full"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Аудиты с результатом ниже 70% будут автоматически добавлены
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  const icons: Record<Priority, React.ElementType> = {
    critical: Flame,
    high: AlertTriangle,
    medium: Clock,
    low: CheckCircle2,
  };
  const gradientMap: Record<Priority, string> = {
    critical: 'bg-gradient-to-r from-red-500/10 to-rose-500/10 dark:from-red-900/30 dark:to-rose-900/20',
    high: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-900/30 dark:to-amber-900/20',
    medium: 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-900/30 dark:to-yellow-900/20',
    low: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/30 dark:to-teal-900/20',
  };
  const Icon = icons[priority];

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 border border-current/10 ${gradientMap[priority]} ${config.textColor}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ActionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'in_progress' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-40`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`} />
    </span>
  );
}

// ─── Description Generator ────────────────────────────────────────────────────

function generateDescription(
  score: number,
  priority: Priority,
  templateTitle: string,
  category: string,
): string {
  const gap = (100 - score).toFixed(1);

  const templates: Record<Priority, string[]> = {
    critical: [
      `Обнаружено критическое несоответствие в категории «${category}». Результат аудита «${templateTitle}» составил ${score}% — недопустимо низкий уровень. Требуется немедленное внедрение корректирующих мер и повторная проверка.`,
      `Серьёзное отклонение от стандартов в «${templateTitle}» (${category}). Оценка ${score}% указывает на системные проблемы. Необходимо провести расследование причинно-следственных связей и разработать план мероприятий.`,
      `Критический уровень соответствия (${score}%) по аудиту «${templateTitle}». Разрыв до целевого показателя: ${gap}%. Рекомендуется экстренное совещание с руководством и назначение ответственных.`,
    ],
    high: [
      `Значительное отклонение от целевых показателей в «${templateTitle}». Результат ${score}% требует разработки и реализации плана корректирующих действий в течение установленного срока.`,
      `Аудит «${templateTitle}» выявил существенные несоответствия в категории «${category}». Текущая оценка ${score}% — необходимо устранить ${gap}% отклонений от стандарта.`,
    ],
    medium: [
      `Умеренное отклонение от нормы по результатам аудита «${templateTitle}». Оценка ${score}% указывает на наличие зон, требующих внимания и постепенного улучшения.`,
      `Аудит «${templateTitle}» (${category}) показал результат ${score}%. Рекомендуется проанализировать слабые места и запланировать улучшения для достижения целевого показателя 70%.`,
    ],
    low: [
      `Незначительное отклонение от целевого порога по аудиту «${templateTitle}». Оценка ${score}% — рекомендуется принять профилактические меры для предотвращения ухудшения.`,
    ],
  };

  const options = templates[priority];
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActionPlans({ isAdmin = false, userId }: ActionPlansProps) {
  // Data
  const [dbPlans, setDbPlans] = useState<ActionPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // View
  const [activeTab, setActiveTab] = useState('all');

  // ─── Fetch action plans from API ──────────────────────────────────────────

  const fetchActionPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/action-plans');
      if (res.ok) {
        const data = await res.json();
        setDbPlans(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Не удалось загрузить корректирующие действия');
    }
  }, []);

  // ─── Auto-generate action plans for completed audits without them ────────

  const autoGeneratePlans = useCallback(async () => {
    try {
      // Fetch all completed audit responses
      const responsesRes = await fetch('/api/responses');
      if (!responsesRes.ok) return;
      const rData = await responsesRes.json();
      const responses: AuditResponse[] = rData.responses ?? [];

      // Fetch existing action plans to find which responses already have them
      const plansRes = await fetch('/api/action-plans');
      if (!plansRes.ok) return;
      const existingPlans: ActionPlanRecord[] = await plansRes.json();
      const coveredResponseIds = new Set(
        existingPlans
          .filter((p) => p.auditResponseId)
          .map((p) => p.auditResponseId),
      );

      // Find completed responses with score < 70 that don't have action plans
      const needsPlan = responses.filter(
        (r) => r.status === 'COMPLETED' && r.score != null && r.score < 70 && !coveredResponseIds.has(r.id),
      );

      if (needsPlan.length === 0) return;

      // Generate action plans for each
      for (const r of needsPlan) {
        const priority = getPriority(r.score);
        const cfg = PRIORITY_CONFIG[priority];
        const templateTitle = r.assignment?.template?.title ?? 'Неизвестный шаблон';
        const category = r.assignment?.template?.category ?? '—';
        const auditorId = r.assignment?.auditor?.id ?? null;
        const now = new Date();
        const dueDate = addDays(now, cfg.daysToDue);

        await fetch('/api/action-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Корректировка: ${templateTitle}`,
            description: generateDescription(r.score, priority, templateTitle, category),
            priority: priority.toUpperCase(),
            assigneeId: auditorId,
            dueDate,
            sourceType: 'AUDIT',
            sourceId: r.id,
            score: r.score,
            auditResponseId: r.id,
          }),
        });
      }

      if (needsPlan.length > 0) {
        toast.success(`Создано ${needsPlan.length} корректирующих действий`);
        // Re-fetch to get the newly created plans
        await fetchActionPlans();
      }
    } catch {
      // Silently fail - action plans will be generated on next load
    }
  }, [fetchActionPlans]);

  // ─── Initial load ────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchActionPlans();
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        await autoGeneratePlans();
      }
      setLoading(false);
    }
    init();
  }, [fetchActionPlans, autoGeneratePlans]);

  // ─── Convert DB records to ActionItems ───────────────────────────────────

  const actionItems = useMemo<ActionItem[]>(() => {
    const now = new Date();

    return dbPlans.map((plan): ActionItem => {
      const priority = (plan.priority.toLowerCase() || 'medium') as Priority;
      const cfg = PRIORITY_CONFIG[priority];

      const templateTitle = plan.auditResponse?.assignment?.template?.title
        ?? plan.title.replace('Корректировка: ', '')
        ?? 'Неизвестный шаблон';
      const category = plan.auditResponse?.assignment?.template?.category ?? '—';
      const auditorName = plan.assignee?.name ?? plan.auditResponse?.assignment?.auditor?.name ?? 'Не назначен';
      const auditorId = plan.assignee?.id ?? plan.auditResponse?.assignment?.auditor?.id ?? '';

      const rawDueDate = plan.dueDate ?? addDays(new Date(plan.createdAt), cfg.daysToDue);
      const rawStatus = plan.status.toLowerCase() as ActionStatus;
      const status = rawStatus === 'new' && isOverdue(rawDueDate, 'new') ? 'overdue' as ActionStatus : rawStatus;

      return {
        id: plan.sourceId ?? plan.id,
        dbId: plan.id,
        priority,
        title: plan.title,
        description: plan.description ?? '',
        relatedAudit: plan.sourceId ?? plan.auditResponseId ?? '',
        relatedTemplate: templateTitle,
        relatedCategory: category,
        auditScore: plan.score ?? 0,
        dueDate: rawDueDate,
        createdAt: plan.createdAt,
        status,
        assignee: auditorName,
        assigneeId: auditorId,
      };
    });
  }, [dbPlans]);

  // ─── Statistics ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = actionItems.length;
    const critical = actionItems.filter((a) => a.priority === 'critical').length;
    const inProgress = actionItems.filter((a) => a.status === 'in_progress').length;
    const completed = actionItems.filter((a) => a.status === 'done').length;
    const overdue = actionItems.filter((a) => a.status === 'overdue').length;
    return { total, critical, inProgress, completed, overdue };
  }, [actionItems]);

  // ─── Priority Distribution for Chart ───────────────────────────────────

  const priorityDistribution = useMemo(() => [
    { priority: 'critical', count: actionItems.filter((a) => a.priority === 'critical').length, fill: '#ef4444' },
    { priority: 'high', count: actionItems.filter((a) => a.priority === 'high').length, fill: '#f97316' },
    { priority: 'medium', count: actionItems.filter((a) => a.priority === 'medium').length, fill: '#f59e0b' },
    { priority: 'low', count: actionItems.filter((a) => a.priority === 'low').length, fill: '#10b981' },
  ], [actionItems]);

  // ─── Unique assignees ─────────────────────────────────────────────────

  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    actionItems.forEach((a) => {
      if (a.assigneeId && !map.has(a.assigneeId)) {
        map.set(a.assigneeId, { id: a.assigneeId, name: a.assignee });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [actionItems]);

  // ─── Filter & Sort ─────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let items = [...actionItems];

    // Tab filter
    if (activeTab === 'critical') {
      items = items.filter((a) => a.priority === 'critical');
    } else if (activeTab === 'in_progress') {
      items = items.filter((a) => a.status === 'in_progress');
    } else if (activeTab === 'completed') {
      items = items.filter((a) => a.status === 'done');
    }

    // Select filters
    if (filterPriority !== 'all') {
      items = items.filter((a) => a.priority === filterPriority);
    }
    if (filterStatus !== 'all') {
      items = items.filter((a) => a.status === filterStatus);
    }
    if (filterAssignee !== 'all') {
      items = items.filter((a) => a.assigneeId === filterAssignee);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dueDate') {
        cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'priority') {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      } else if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [actionItems, activeTab, filterPriority, filterStatus, filterAssignee, sortBy, sortDir]);

  const hasFilters = filterPriority !== 'all' || filterStatus !== 'all' || filterAssignee !== 'all' || activeTab !== 'all';

  // ─── Status change handler (API call) ──────────────────────────────────

  const handleStatusChange = useCallback(async (dbId: string, newStatus: ActionStatus) => {
    try {
      const statusMap: Record<ActionStatus, string> = {
        new: 'NEW',
        in_progress: 'IN_PROGRESS',
        done: 'DONE',
        overdue: 'NEW', // overdue is virtual - stored as NEW
      };
      const res = await fetch('/api/action-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dbId, status: statusMap[newStatus] }),
      });
      if (res.ok) {
        // Update local state
        setDbPlans((prev) =>
          prev.map((p) => (p.id === dbId ? { ...p, status: statusMap[newStatus] } : p)),
        );
        const statusLabels: Record<ActionStatus, string> = {
          new: 'Новое',
          in_progress: 'В работе',
          done: 'Выполнено',
          overdue: 'Просрочено',
        };
        toast.success(`Статус обновлён: ${statusLabels[newStatus]}`);
      } else {
        toast.error('Не удалось обновить статус');
      }
    } catch {
      toast.error('Ошибка при обновлении статуса');
    }
  }, []);

  // ─── Delete handler (API call) ────────────────────────────────────────

  const handleDelete = useCallback(async (dbId: string) => {
    try {
      const res = await fetch(`/api/action-plans?id=${dbId}`, { method: 'DELETE' });
      if (res.ok) {
        setDbPlans((prev) => prev.filter((p) => p.id !== dbId));
        toast.success('Корректирующее действие удалено');
      } else {
        toast.error('Не удалось удалить действие');
      }
    } catch {
      toast.error('Ошибка при удалении');
    }
  }, []);

  function clearFilters() {
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterAssignee('all');
    setActiveTab('all');
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div className="h-6 w-20 rounded bg-muted" />
                  <div className="h-3 w-28 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="animate-pulse space-y-3" style={{ height: 200 }}>
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="flex-1 rounded-lg bg-muted/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="animate-pulse space-y-3" style={{ height: 200 }}>
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="flex-1 rounded-lg bg-muted/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            Корректирующие действия
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Автоматически сгенерированные меры на основе результатов аудитов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 text-xs bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400"
          >
            <Target className="w-3.5 h-3.5" />
            Порог: 70%
          </Badge>
        </div>
      </motion.div>

      {/* Welcome Section */}
      {(() => {
        const welcome = getWelcomeData(stats);
        const WelcomeIcon = welcome.icon;
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/10 p-5"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-gradient-to-tr from-teal-500/5 to-transparent rounded-full translate-y-1/2" />
            <div className="relative flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${welcome.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <WelcomeIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-bold tracking-tight">{welcome.message}</h2>
                  <Badge className={`text-[10px] px-2 py-0 rounded-full border-0 ${welcome.badgeColor}`}>
                    {stats.total} {stats.total === 1 ? 'действие' : stats.total < 5 ? 'действия' : 'действий'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{welcome.sub}</p>
              </div>
              {stats.total > 0 && (
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">выполнено</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            title: 'Всего действий',
            value: stats.total,
            icon: ListTodo,
            color: 'text-slate-700 dark:text-slate-300',
            bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20',
            iconBg: 'bg-slate-200 dark:bg-slate-700',
            borderColor: 'border-slate-100 dark:border-slate-900/50',
            desc: 'Мер принято',
          },
          {
            title: 'Критических',
            value: stats.critical,
            icon: Flame,
            color: 'text-red-700 dark:text-red-400',
            bgColor: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
            iconBg: 'bg-red-100 dark:bg-red-900/50',
            borderColor: 'border-red-100 dark:border-red-900/50',
            desc: `${stats.overdue} просрочено`,
          },
          {
            title: 'В работе',
            value: stats.inProgress,
            icon: Clock,
            color: 'text-amber-700 dark:text-amber-400',
            bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20',
            iconBg: 'bg-amber-100 dark:bg-amber-900/50',
            borderColor: 'border-amber-100 dark:border-amber-900/50',
            desc: 'Исполняется сейчас',
          },
          {
            title: 'Выполнено',
            value: stats.completed,
            icon: CheckCircle2,
            color: 'text-emerald-700 dark:text-emerald-400',
            bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
            borderColor: 'border-emerald-100 dark:border-emerald-900/50',
            desc: stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(0)}% готово` : '—',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
            >
              <Card className={`overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border ${card.borderColor}`}>
                <CardContent className={`p-4 sm:p-5 ${card.bgColor}`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} shadow-sm`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="text-right">
                      <motion.div
                        className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.07 + 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                      >
                        {card.value}
                      </motion.div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className={`text-sm font-semibold ${card.color}`}>{card.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{card.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Priority Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-orange-100 dark:border-orange-900/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Распределение по приоритету
              </CardTitle>
              <CardDescription>Количество корректирующих действий по уровню критичности</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityDistribution} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      {priorityDistribution.map((entry, i) => (
                        <linearGradient
                          key={`pGrad${i}`}
                          id={`pGrad${i}`}
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.5} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis
                      dataKey="priority"
                      tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                      axisLine={{ stroke: 'oklch(0.88 0 0)' }}
                      tickLine={false}
                      tickFormatter={(v: string) => {
                        const labels: Record<string, string> = {
                          critical: 'Критический',
                          high: 'Высокий',
                          medium: 'Средний',
                          low: 'Низкий',
                        };
                        return labels[v] || v;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={64}>
                      {priorityDistribution.map((_, i) => (
                        <Cell key={i} fill={`url(#pGrad${i})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-2 pt-3 border-t border-border/50">
                {priorityDistribution.map((entry) => {
                  const labels: Record<string, string> = {
                    critical: 'Критический',
                    high: 'Высокий',
                    medium: 'Средний',
                    low: 'Низкий',
                  };
                  return (
                    <div key={entry.priority} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
                      <span className="text-xs text-muted-foreground">{labels[entry.priority]}</span>
                      <span className="text-xs font-bold tabular-nums">{entry.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Обзор эффективности
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Completion Rate Ring */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
                    <motion.circle
                      cx="32" cy="32" r="26" fill="none" stroke="url(#completionGrad)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 26}
                      initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - (stats.total > 0 ? stats.completed / stats.total : 0)) }}
                      transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                    />
                    <defs>
                      <linearGradient id="completionGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">Прогресс выполнения</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stats.completed} из {stats.total} выполнено
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-2">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                      transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Status Breakdown */}
              <div className="space-y-2.5">
                {(Object.entries(STATUS_CONFIG) as [ActionStatus, typeof STATUS_CONFIG[ActionStatus]][]).map(([key, config]) => {
                  const count = key === 'overdue'
                    ? stats.overdue
                    : actionItems.filter((a) => a.status === key).length;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const StatusIcon = config.icon;

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-3.5 h-3.5 ${config.color.includes('red') ? 'text-red-500' : config.color.includes('blue') ? 'text-blue-500' : config.color.includes('emerald') ? 'text-emerald-500' : 'text-slate-500'}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
                          <span className="text-sm font-bold tabular-nums">{count}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${config.dotColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.6, duration: 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Urgency Metric */}
              <div className="rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">Срочность</span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {stats.critical > 0
                    ? `Требуется немедленное внимание: ${stats.critical} критических ${stats.critical === 1 ? 'действие' : stats.critical < 5 ? 'действия' : 'действий'}.`
                    : 'Нет критических действий на данный момент.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="bg-muted/60 backdrop-blur-sm p-1 h-auto flex-wrap border border-border/50 shadow-sm">
              <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-orange-500/20">
                <ListTodo className="w-3.5 h-3.5" />
                Все
                {stats.total > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] tabular-nums">
                    {stats.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="critical" className="gap-1.5 text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-red-500/20">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                Критические
                {stats.critical > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] tabular-nums">
                    {stats.critical}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-1.5 text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                В работе
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5 text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Выполнено
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
              style={{ display: hasFilters ? 'flex' : 'none' }}
            >
              <Plus className="w-3 h-3 rotate-45" />
              Сбросить фильтры
            </Button>
          </div>

          {/* Filter Bar */}
          <Card className="border-dashed">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Фильтры</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все приоритеты</SelectItem>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Критический
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Высокий
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Средний
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Низкий
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                    <CircleDot className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="new">Новое</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="done">Выполнено</SelectItem>
                    <SelectItem value="overdue">Просрочено</SelectItem>
                  </SelectContent>
                </Select>

                {isAdmin && assignees.length > 0 && (
                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
                      <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Исполнитель" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все исполнители</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="truncate">{a.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Sort Buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">Сортировка:</span>
                  {[
                    { field: 'dueDate', label: 'Срок' },
                    { field: 'priority', label: 'Приоритет' },
                    { field: 'createdAt', label: 'Дата' },
                  ].map((opt) => (
                    <Button
                      key={opt.field}
                      variant={sortBy === opt.field ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-[11px] px-2.5 gap-1 ${
                        sortBy === opt.field
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shadow-orange-500/20'
                          : ''
                      }`}
                      onClick={() => toggleSort(opt.field)}
                    >
                      {opt.label}
                      {sortBy === opt.field && (
                        <motion.span
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: sortDir === 'asc' ? 0 : 180, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </motion.span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ TAB CONTENT ═══════════════════════════════════════════════ */}
          {['all', 'critical', 'in_progress', 'completed'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {filteredItems.length === 0 ? (
                <EmptyState hasFilters={hasFilters} />
              ) : (
                <ScrollArea className="max-h-[calc(100vh-200px)]">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3 pr-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map((action, idx) => {
                        const priorityCfg = PRIORITY_CONFIG[action.priority];
                        const statusCfg = STATUS_CONFIG[action.status];
                        const StatusIcon = statusCfg.icon;
                        const isDone = action.status === 'done';

                        return (
                          <motion.div
                            key={action.dbId}
                            variants={itemVariants}
                            exit="exit"
                            layout
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: idx * 0.04 }}
                          >
                            <motion.div
                              variants={cardHover}
                              initial="rest"
                              whileHover="hover"
                            >
                              <Card
                                className={`overflow-hidden border-l-4 ${priorityCfg.borderColor} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                                  isDone
                                    ? 'opacity-70 bg-muted/30'
                                    : action.status === 'overdue'
                                      ? 'ring-1 ring-red-200 dark:ring-red-800/50'
                                      : ''
                                } ${action.priority === 'critical' && !isDone ? 'pulse-glow' : ''}`}
                              >
                                <CardContent className="p-4 sm:p-5">
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2.5">
                                      {/* Top Row */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        <PriorityBadge priority={action.priority} />
                                        <Badge
                                          variant="outline"
                                          className={`text-[11px] gap-1.5 px-2.5 py-0.5 ${statusCfg.color} border-0`}
                                        >
                                          <StatusIcon className="w-3 h-3" />
                                          {statusCfg.label}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-2 py-0 bg-muted/50 text-muted-foreground border-0"
                                        >
                                          {action.auditScore.toFixed(1)}%
                                        </Badge>
                                      </div>

                                      {/* Title */}
                                      <h3 className={`font-semibold text-sm sm:text-base leading-snug ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                                        {action.title}
                                      </h3>

                                      {/* Description */}
                                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                        {action.description}
                                      </p>

                                      {/* Meta Row */}
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                          <Shield className="w-3 h-3" />
                                          {action.relatedTemplate}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                          <ArrowRight className="w-3 h-3" />
                                          {action.relatedCategory}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                          <Clock className="w-3 h-3" />
                                          Срок: {formatDateShort(action.dueDate)}
                                          {(() => {
                                            const dueStyle = getDueDateStyle(action.dueDate, action.status);
                                            return dueStyle.label ? (
                                              <span className={`ml-1 ${dueStyle.color}`}>{dueStyle.label}</span>
                                            ) : null;
                                          })()}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Actions Column */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                      {/* Score Circle */}
                                      <div className="relative w-12 h-12">
                                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                          <circle
                                            cx="24" cy="24" r="20"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            className="text-muted/20"
                                          />
                                          <circle
                                            cx="24" cy="24" r="20"
                                            fill="none"
                                            stroke={priorityCfg.barColor}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 20}`}
                                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - action.auditScore / 100)}`}
                                            className="transition-all duration-700 ease-out"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-[11px] font-bold text-foreground">
                                            {Math.round(action.auditScore)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Status Actions */}
                                      {!isDone && (
                                        <div className="flex gap-1.5">
                                          {action.status !== 'in_progress' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 text-[11px] gap-1 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:hover:bg-blue-950/50"
                                              onClick={() => handleStatusChange(action.dbId, 'in_progress')}
                                            >
                                              <CircleDot className="w-3 h-3" />
                                              В работу
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px] gap-1 px-2.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                                            onClick={() => handleStatusChange(action.dbId, 'done')}
                                          >
                                            <CircleCheck className="w-3 h-3" />
                                            Готово
                                          </Button>
                                        </div>
                                      )}

                                      {isDone && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[11px] gap-1 px-2.5 text-muted-foreground"
                                          onClick={() => handleStatusChange(action.dbId, 'new')}
                                        >
                                          Вернуть
                                        </Button>
                                      )}

                                      {/* Delete */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[11px] gap-1 px-2.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        onClick={() => handleDelete(action.dbId)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Удалить
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </ScrollArea>
              )}

              {/* Results Count */}
              {filteredItems.length > 0 && (
                <div className="text-xs text-muted-foreground text-right mt-3 pr-2">
                  Показано {filteredItems.length} из {actionItems.length} действий
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
}
