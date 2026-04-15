'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileBarChart, TrendingUp, TrendingDown, Minus,
  Trophy, AlertTriangle, Target, BarChart3,
  Copy, Download, Users, ClipboardList, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsOverview {
  totalAssignments: number;
  completedAssignments: number;
  avgScore: number;
  completionRate: number;
  totalAuditors: number;
  totalTemplates: number;
  scheduledAssignments: number;
  inProgressAssignments: number;
  overdueAssignments: number;
}

interface AuditorEntry {
  name: string;
  department: string;
  totalAudits: number;
  avgScore: number;
}

interface CategoryEntry {
  name: string;
  count: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  auditorPerformance: AuditorEntry[];
  categoryData: CategoryEntry[];
  scoresOverTime: { date: string; score: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Отлично';
  if (score >= 75) return 'Хорошо';
  if (score >= 60) return 'Удовлетворительно';
  if (score >= 40) return 'Ниже среднего';
  return 'Критично';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-teal-600 dark:text-teal-400';
  if (score >= 60) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-teal-50 dark:bg-teal-950/40';
  if (score >= 60) return 'bg-emerald-50 dark:bg-emerald-950/40';
  if (score >= 40) return 'bg-amber-50 dark:bg-amber-950/40';
  return 'bg-red-50 dark:bg-red-950/40';
}

function getTrendIcon(current: number, previous: number): React.ElementType {
  if (previous === 0) return Minus;
  const diff = ((current - previous) / previous) * 100;
  if (diff > 2) return TrendingUp;
  if (diff < -2) return TrendingDown;
  return Minus;
}

function getTrendColor(current: number, previous: number): string {
  if (previous === 0) return 'text-muted-foreground';
  const diff = ((current - previous) / previous) * 100;
  if (diff > 2) return 'text-emerald-600 dark:text-emerald-400';
  if (diff < -2) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditSummaryReport() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        toast.error('Не удалось загрузить данные аналитики');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // This month / last month split
  const { thisMonth, lastMonth } = useMemo(() => {
    if (!data?.scoresOverTime.length) return { thisMonth: 0, lastMonth: 0 };
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const thisMonthScores = data.scoresOverTime.filter(s => s.date >= thisMonthStart);
    const lastMonthScores = data.scoresOverTime.filter(s => s.date >= lastMonthStart && s.date < thisMonthStart);
    const avg = (arr: { score: number }[]) =>
      arr.length > 0 ? arr.reduce((sum, s) => sum + s.score, 0) / arr.length : 0;
    return { thisMonth: avg(thisMonthScores), lastMonth: avg(lastMonthScores) };
  }, [data]);

  const topPerformers = useMemo(() => {
    if (!data?.auditorPerformance.length) return [];
    return [...data.auditorPerformance]
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);
  }, [data]);

  const bottomPerformers = useMemo(() => {
    if (!data?.auditorPerformance.length) return [];
    return [...data.auditorPerformance]
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3);
  }, [data]);

  const trendIcon = getTrendIcon(thisMonth, lastMonth);
  const TrendIcon = trendIcon;

  // ─── Copy Report ─────────────────────────────────────────────────────────

  const handleCopyReport = async () => {
    if (!data) return;
    const ov = data.overview;
    const now = new Date();
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const trendLabel = lastMonth > 0
      ? `📊 Тренд vs прошлый месяц: ${thisMonth > lastMonth ? '📈 +' : thisMonth < lastMonth ? '📉 ' : '➡️ '}${((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)}%`
      : '📊 Тренд: нет данных за прошлый месяц';

    const topText = topPerformers.length > 0
      ? `🏆 Лучшие аудиторы:\n${topPerformers.map((a, i) => `  ${i + 1}. ${a.name} (${a.department}) — ${a.avgScore.toFixed(1)}%`).join('\n')}`
      : '🏆 Лучшие аудиторы: нет данных';

    const bottomText = bottomPerformers.length > 0
      ? `⚠️ Требуют внимания:\n${bottomPerformers.map((a, i) => `  ${i + 1}. ${a.name} (${a.department}) — ${a.avgScore.toFixed(1)}%`).join('\n')}`
      : '⚠️ Требуют внимания: нет данных';

    const categoryText = data.categoryData.length > 0
      ? `📋 Категории:\n${data.categoryData.map(c => `  • ${c.name}: ${c.count} аудитов`).join('\n')}`
      : '📋 Категории: нет данных';

    const report = [
      `📋 СВОДКА АУДИТОВ — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📈 Всего аудитов: ${ov.totalAssignments}`,
      `✅ Завершено: ${ov.completedAssignments}`,
      `📝 Средний балл: ${ov.avgScore.toFixed(1)}% (${getScoreLabel(ov.avgScore)})`,
      `📊 Выполнение: ${ov.completionRate.toFixed(1)}%`,
      `👥 Аудиторов: ${ov.totalAuditors}`,
      ``,
      trendLabel,
      ``,
      topText,
      ``,
      bottomText,
      ``,
      categoryText,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🕐 Сформировано: ${now.toLocaleString('ru-RU')}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      toast.success('Отчёт скопирован в буфер обмена');
    } catch {
      toast.error('Не удалось скопировать отчёт');
    }
  };

  // ─── Download HTML ───────────────────────────────────────────────────────

  const handleDownloadHTML = () => {
    if (!data) return;
    const ov = data.overview;
    const now = new Date();
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const trendDiff = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : null;
    const trendColor = trendDiff ? (Number(trendDiff) > 0 ? '#059669' : Number(trendDiff) < 0 ? '#dc2626' : '#6b7280') : '#6b7280';
    const trendArrow = trendDiff ? (Number(trendDiff) > 0 ? '↑' : Number(trendDiff) < 0 ? '↓' : '→') : '';

    const scoreColor = ov.avgScore >= 80 ? '#0d9488' : ov.avgScore >= 60 ? '#059669' : ov.avgScore >= 40 ? '#d97706' : '#dc2626';

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Сводка аудитов — ${monthName}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; }
.container { max-width: 680px; margin: 0 auto; }
.header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.header p { opacity: 0.85; font-size: 14px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.card .value { font-size: 28px; font-weight: 700; }
.card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
.section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; }
.section h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #334155; display: flex; align-items: center; gap: 8px; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.row:last-child { border-bottom: none; }
.name { font-size: 14px; font-weight: 500; }
.score-badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
.footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px; }
.trend { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; padding: 6px 14px; border-radius: 8px; background: #f1f5f9; }
.cat-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.cat-row:last-child { border-bottom: none; }
.cat-name { font-size: 13px; color: #475569; }
.cat-count { font-size: 13px; font-weight: 600; color: #334155; background: #f1f5f9; padding: 2px 10px; border-radius: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📋 Сводка аудитов</h1>
    <p>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</p>
  </div>

  <div class="cards">
    <div class="card"><div class="value">${ov.totalAssignments}</div><div class="label">Всего аудитов</div></div>
    <div class="card"><div class="value" style="color:${scoreColor}">${ov.avgScore.toFixed(1)}%</div><div class="label">Средний балл</div></div>
    <div class="card"><div class="value">${ov.completionRate.toFixed(0)}%</div><div class="label">Выполнение</div></div>
    <div class="card"><div class="value">${ov.totalAuditors}</div><div class="label">Аудиторов</div></div>
  </div>

  ${trendDiff ? `<div style="margin-bottom:24px"><span class="trend" style="color:${trendColor}">${trendArrow} Тренд vs прошлый месяц: ${trendDiff}%</span></div>` : ''}

  ${topPerformers.length > 0 ? `<div class="section"><h2>🏆 Лучшие аудиторы</h2>${topPerformers.map(a => `<div class="row"><span class="name">${a.name} <small style="color:#94a3b8">(${a.department})</small></span><span class="score-badge" style="background:#ecfdf5;color:#059669">${a.avgScore.toFixed(1)}%</span></div>`).join('')}</div>` : ''}

  ${bottomPerformers.length > 0 ? `<div class="section"><h2>⚠️ Требуют внимания</h2>${bottomPerformers.map(a => `<div class="row"><span class="name">${a.name} <small style="color:#94a3b8">(${a.department})</small></span><span class="score-badge" style="background:#fef2f2;color:#dc2626">${a.avgScore.toFixed(1)}%</span></div>`).join('')}</div>` : ''}

  ${data.categoryData.length > 0 ? `<div class="section"><h2>📋 Категории</h2>${data.categoryData.map(c => `<div class="cat-row"><span class="cat-name">${c.name}</span><span class="cat-count">${c.count} ауд.</span></div>`).join('')}</div>` : ''}

  <div class="footer">Сформировано: ${now.toLocaleString('ru-RU')} · AuditPro v2.4</div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-summary-${now.toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML-отчёт загружен');
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-20 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileBarChart className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">Не удалось загрузить данные</p>
      </div>
    );
  }

  const ov = data.overview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-500" />
            Сводка аудитов
          </h1>
          <p className="text-muted-foreground mt-1">
            Обзор показателей за {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyReport}>
            <Copy className="w-4 h-4" />
            Скопировать отчёт
          </Button>
          <Button size="sm" className="gap-2" onClick={handleDownloadHTML}>
            <Download className="w-4 h-4" />
            Скачать как HTML
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Всего аудитов', value: ov.totalAssignments, icon: BarChart3, bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-600 dark:text-emerald-400' },
          { title: 'Средний балл', value: `${ov.avgScore.toFixed(1)}%`, icon: Target, bg: getScoreBg(ov.avgScore), color: getScoreColor(ov.avgScore), sub: getScoreLabel(ov.avgScore) },
          { title: 'Выполнение', value: `${ov.completionRate.toFixed(1)}%`, icon: ClipboardList, bg: 'bg-teal-50 dark:bg-teal-950/40', color: 'text-teal-600 dark:text-teal-400' },
          { title: 'Аудиторов активно', value: ov.totalAuditors, icon: Users, bg: 'bg-violet-50 dark:bg-violet-950/40', color: 'text-violet-600 dark:text-violet-400' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg} mb-3`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{card.title}</div>
                  {(card as { sub?: string }).sub && (
                    <Badge variant="outline" className={`mt-2 text-[10px] ${getScoreBg(ov.avgScore)} ${getScoreColor(ov.avgScore)} border-0`}>
                      {(card as { sub?: string }).sub}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Trend vs Last Month */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-500" />
              Тренд vs прошлый месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-center px-4 py-2 rounded-xl bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Этот месяц</div>
                  <div className={`text-xl font-bold ${getScoreColor(thisMonth)}`}>
                    {thisMonth.toFixed(1)}%
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="text-center px-4 py-2 rounded-xl bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Прошлый месяц</div>
                  <div className={`text-xl font-bold ${getScoreColor(lastMonth)}`}>
                    {lastMonth.toFixed(1)}%
                  </div>
                </div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex items-center gap-2">
                <TrendIcon className={`w-5 h-5 ${getTrendColor(thisMonth, lastMonth)}`} />
                {lastMonth > 0 ? (
                  <span className={`text-lg font-bold ${getTrendColor(thisMonth, lastMonth)}`}>
                    {((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Нет данных за прошлый месяц</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Лучшие аудиторы
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {topPerformers.map((a, i) => (
                    <div key={a.name} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.department || '—'}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                        {a.avgScore.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Performers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Требуют внимания
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bottomPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {bottomPerformers.map((a, i) => (
                    <div key={a.name} className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.department || '—'}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
                        {a.avgScore.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Категории аудитов
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет данных по категориям</p>
            ) : (
              <div className="space-y-2">
                {data.categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs">{cat.count} аудитов</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
