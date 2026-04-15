'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, CalendarDays, Users, ClipboardList, Loader2, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Shuffle, ArrowRightLeft,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateData {
  id: string;
  title: string;
  category: string;
  status: string;
  questions?: { id: string }[];
}

interface AuditorData {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  isActive?: boolean;
}

interface PreviewItem {
  templateId: string;
  templateName: string;
  auditorId: string;
  auditorName: string;
  scheduledDate: string;
}

type Frequency = 'weekly' | 'monthly' | 'quarterly';
type AssignmentMethod = 'evenly' | 'random';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRu(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function generateDates(startDate: string, endDate: string, frequency: Frequency): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);

    switch (frequency) {
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
    }
  }
  return dates;
}

function assignEvenly(
  templates: TemplateData[],
  auditors: AuditorData[],
  dates: string[],
): PreviewItem[] {
  const items: PreviewItem[] = [];
  let auditorIndex = 0;

  for (const date of dates) {
    for (const template of templates) {
      const auditor = auditors[auditorIndex % auditors.length];
      items.push({
        templateId: template.id,
        templateName: template.title,
        auditorId: auditor.id,
        auditorName: auditor.name,
        scheduledDate: date,
      });
      auditorIndex++;
    }
  }
  return items;
}

function assignRandom(
  templates: TemplateData[],
  auditors: AuditorData[],
  dates: string[],
): PreviewItem[] {
  const items: PreviewItem[] = [];

  for (const date of dates) {
    for (const template of templates) {
      const auditor = auditors[Math.floor(Math.random() * auditors.length)];
      items.push({
        templateId: template.id,
        templateName: template.title,
        auditorId: auditor.id,
        auditorName: auditor.name,
        scheduledDate: date,
      });
    }
  }
  return items;
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

interface AutoAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AutoAssignDialog({ open, onOpenChange, onCreated }: AutoAssignDialogProps) {
  // Data state
  const [allTemplates, setAllTemplates] = useState<TemplateData[]>([]);
  const [allAuditors, setAllAuditors] = useState<AuditorData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Selection state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<Set<string>>(new Set());
  const [assignmentMethod, setAssignmentMethod] = useState<AssignmentMethod>('evenly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  // UI state
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAuditors, setShowAuditors] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);

  const abortRef = useRef(false);

  // ─── Fetch Data ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [tplRes, audRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/users?role=AUDITOR&isActive=true'),
      ]);

      if (!tplRes.ok || !audRes.ok) throw new Error('Fetch failed');

      const tplData: TemplateData[] = await tplRes.json();
      const audData: AuditorData[] = await audRes.json();

      setAllTemplates(tplData.filter((t) => t.status === 'ACTIVE'));
      setAllAuditors(audData);
    } catch {
      toast.error('Не удалось загрузить данные для автоназначения');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedTemplateIds(new Set());
      setSelectedAuditorIds(new Set());
      setAssignmentMethod('evenly');
      setStartDate('');
      setEndDate('');
      setFrequency('weekly');
      setShowTemplates(true);
      setShowAuditors(true);
      setShowPreview(false);
      setCreating(false);
      setCreateProgress(0);
      setCreatedCount(0);
      abortRef.current = false;
    }
  }, [open]);

  // ─── Template Selection ────────────────────────────────────────────────

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllTemplates = () => {
    if (selectedTemplateIds.size === allTemplates.length) {
      setSelectedTemplateIds(new Set());
    } else {
      setSelectedTemplateIds(new Set(allTemplates.map((t) => t.id)));
    }
  };

  // ─── Auditor Selection ─────────────────────────────────────────────────

  const toggleAuditor = (id: string) => {
    setSelectedAuditorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAuditors = () => {
    if (selectedAuditorIds.size === allAuditors.length) {
      setSelectedAuditorIds(new Set());
    } else {
      setSelectedAuditorIds(new Set(allAuditors.map((a) => a.id)));
    }
  };

  // ─── Preview ───────────────────────────────────────────────────────────

  const selectedTemplates = useMemo(
    () => allTemplates.filter((t) => selectedTemplateIds.has(t.id)),
    [allTemplates, selectedTemplateIds],
  );

  const selectedAuditors = useMemo(
    () => allAuditors.filter((a) => selectedAuditorIds.has(a.id)),
    [allAuditors, selectedAuditorIds],
  );

  const previewItems = useMemo(() => {
    if (!startDate || !endDate || selectedTemplates.length === 0 || selectedAuditors.length === 0) {
      return [];
    }
    const dates = generateDates(startDate, endDate, frequency);
    if (dates.length === 0) return [];

    if (assignmentMethod === 'evenly') {
      return assignEvenly(selectedTemplates, selectedAuditors, dates);
    }
    return assignRandom(selectedTemplates, selectedAuditors, dates);
  }, [startDate, endDate, frequency, selectedTemplates, selectedAuditors, assignmentMethod]);

  const canCreate = previewItems.length > 0 && !creating;

  // ─── Create Assignments ────────────────────────────────────────────────

  const handleCreate = async () => {
    if (previewItems.length === 0) return;

    setCreating(true);
    setCreateProgress(0);
    setCreatedCount(0);
    abortRef.current = false;

    let successCount = 0;
    const total = previewItems.length;

    try {
      for (let i = 0; i < total; i++) {
        if (abortRef.current) break;

        const item = previewItems[i];
        const dueDate = new Date(item.scheduledDate);
        dueDate.setDate(dueDate.getDate() + 3);

        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: item.templateId,
            auditorId: item.auditorId,
            scheduledDate: item.scheduledDate,
            dueDate: dueDate.toISOString().split('T')[0],
            notes: 'Создано автоназначением',
          }),
        });

        if (res.ok) successCount++;
        setCreateProgress(Math.round(((i + 1) / total) * 100));
        setCreatedCount(i + 1);
      }

      if (abortRef.current) {
        toast.info(`Создание прервано. Успешно: ${successCount} из ${total}`);
      } else {
        toast.success(`Создано ${successCount} из ${total} назначений`);
      }

      onCreated();
      onOpenChange(false);
    } catch {
      toast.error('Произошла ошибка при создании назначений');
    } finally {
      setCreating(false);
      setCreateProgress(0);
      setCreatedCount(0);
    }
  };

  const handleCancel = () => {
    if (creating) {
      abortRef.current = true;
    } else {
      onOpenChange(false);
    }
  };

  // ─── Frequency labels ──────────────────────────────────────────────────

  const frequencyLabels: Record<Frequency, string> = {
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
    quarterly: 'Ежеквартально',
  };

  const frequencyDays: Record<Frequency, string> = {
    weekly: 'каждые 7 дней',
    monthly: 'каждый месяц',
    quarterly: 'каждые 3 месяца',
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!creating) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white text-lg">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                Автоназначение аудитов
              </DialogTitle>
              <DialogDescription className="text-emerald-100/80">
                Автоматическое создание назначений по расписанию
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-4 overflow-y-auto flex-1 custom-scrollbar">
            {dataLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-sm text-muted-foreground">Загрузка данных...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. Template Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      Шаблоны аудита
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {selectedTemplateIds.size}/{allTemplates.length}
                      </Badge>
                    </Label>
                    {allTemplates.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={toggleAllTemplates}
                      >
                        {selectedTemplateIds.size === allTemplates.length ? 'Снять все' : 'Выбрать все'}
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 text-sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    <span className="text-muted-foreground truncate">
                      {selectedTemplateIds.size === 0
                        ? 'Выберите шаблоны...'
                        : `Выбрано шаблонов: ${selectedTemplateIds.size}`}
                    </span>
                    {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  <AnimatePresence>
                    {showTemplates && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border rounded-lg max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 p-1">
                          {allTemplates.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Нет активных шаблонов
                            </div>
                          ) : (
                            allTemplates.map((tpl) => (
                              <label
                                key={tpl.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/80 ${
                                  selectedTemplateIds.has(tpl.id) ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={selectedTemplateIds.has(tpl.id)}
                                  onCheckedChange={() => toggleTemplate(tpl.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{tpl.title}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                      {tpl.category}
                                    </Badge>
                                    {tpl.questions && (
                                      <span className="text-[11px] text-muted-foreground">
                                        {tpl.questions.length} вопр.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* 2. Assignment Method */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                    Метод назначения
                  </Label>
                  <RadioGroup
                    value={assignmentMethod}
                    onValueChange={(v) => setAssignmentMethod(v as AssignmentMethod)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label
                      className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
                        assignmentMethod === 'evenly'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value="evenly" />
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className={`w-4 h-4 ${assignmentMethod === 'evenly' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="text-sm font-medium">Равномерно</div>
                          <div className="text-[11px] text-muted-foreground">Чередование аудиторов</div>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
                        assignmentMethod === 'random'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value="random" />
                      <div className="flex items-center gap-2">
                        <Shuffle className={`w-4 h-4 ${assignmentMethod === 'random' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="text-sm font-medium">Случайно</div>
                          <div className="text-[11px] text-muted-foreground">Случайный выбор</div>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Separator />

                {/* 3. Auditor Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Аудиторы
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {selectedAuditorIds.size}/{allAuditors.length}
                      </Badge>
                    </Label>
                    {allAuditors.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={toggleAllAuditors}
                      >
                        {selectedAuditorIds.size === allAuditors.length ? 'Снять все' : 'Выбрать все'}
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 text-sm"
                    onClick={() => setShowAuditors(!showAuditors)}
                  >
                    <span className="text-muted-foreground truncate">
                      {selectedAuditorIds.size === 0
                        ? 'Выберите аудиторов...'
                        : `Выбрано аудиторов: ${selectedAuditorIds.size}`}
                    </span>
                    {showAuditors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  <AnimatePresence>
                    {showAuditors && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border rounded-lg max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 p-1">
                          {allAuditors.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Нет активных аудиторов
                            </div>
                          ) : (
                            allAuditors.map((aud) => (
                              <label
                                key={aud.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/80 ${
                                  selectedAuditorIds.has(aud.id) ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={selectedAuditorIds.has(aud.id)}
                                  onCheckedChange={() => toggleAuditor(aud.id)}
                                />
                                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {getInitials(aud.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{aud.name}</div>
                                  {aud.department && (
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {aud.department}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* 4. Schedule Settings */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    Параметры расписания
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Дата начала</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Дата окончания</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9"
                        min={startDate || undefined}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Частота</Label>
                      <div className="grid grid-cols-1 gap-1">
                        {(['weekly', 'monthly', 'quarterly'] as Frequency[]).map((f) => (
                          <label
                            key={f}
                            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-xs ${
                              frequency === f
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-medium ring-1 ring-emerald-500/30'
                                : 'hover:bg-muted/50 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="radio"
                              name="frequency"
                              value={f}
                              checked={frequency === f}
                              onChange={() => setFrequency(f)}
                              className="sr-only"
                            />
                            {frequencyLabels[f]}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Schedule info */}
                  {startDate && endDate && selectedTemplateIds.size > 0 && selectedAuditorIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span>Шаблонов:</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{selectedTemplateIds.size}</Badge>
                        <span>· Аудиторов:</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{selectedAuditorIds.length}</Badge>
                        <span>· Частота:</span>
                        <span className="font-medium">{frequencyDays[frequency]}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <Separator />

                {/* 5. Preview Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        Предпросмотр
                      </Label>
                      {previewItems.length > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-[11px]">
                          Будет создано {previewItems.length} назначений
                        </Badge>
                      )}
                    </div>
                    {previewItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? 'Скрыть' : 'Показать таблицу'}
                        {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>

                  {previewItems.length === 0 && (
                    <div className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg">
                      Выберите шаблоны, аудиторов и укажите период для предпросмотра
                    </div>
                  )}

                  {previewItems.length > 0 && (
                    <AnimatePresence>
                      {showPreview && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[11px] font-semibold">Шаблон</TableHead>
                                    <TableHead className="text-[11px] font-semibold">Аудитор</TableHead>
                                    <TableHead className="text-[11px] font-semibold">Дата</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {previewItems.map((item, idx) => (
                                    <TableRow key={`${item.templateId}-${item.auditorId}-${item.scheduledDate}-${idx}`} className="text-xs">
                                      <TableCell className="py-1.5">
                                        <span className="truncate block max-w-[200px]">{item.templateName}</span>
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                                            {getInitials(item.auditorName)}
                                          </div>
                                          <span className="truncate">{item.auditorName}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1.5 text-muted-foreground whitespace-nowrap">
                                        {formatDateRu(item.scheduledDate)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                {/* 6. Progress indicator */}
                {creating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Создание назначений...
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {createdCount}/{previewItems.length}
                      </span>
                    </div>
                    <Progress value={createProgress} className="h-2" />
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* 7. Action Buttons */}
          <div className="border-t px-6 py-4 bg-muted/30 rounded-b-lg">
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={dataLoading}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Прервать
                  </>
                ) : (
                  'Отмена'
                )}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Создать назначения
                    {previewItems.length > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0 text-[10px] h-5 px-1.5">
                        {previewItems.length}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
