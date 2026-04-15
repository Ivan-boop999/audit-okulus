'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Comment {
  id: string;
  responseId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
}

interface AuditCommentsProps {
  responseId: string;
  userId: string;
  userName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  'bg-orange-500/15 text-orange-700 dark:text-orange-400',
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'только что';
  if (diffMinutes < 60) {
    const mins = diffMinutes;
    if (mins === 1) return '1 мин назад';
    if (mins < 5) return `${mins} мин назад`;
    return `${mins} мин назад`;
  }
  if (diffHours < 24) {
    if (diffHours === 1) return '1 час назад';
    if (diffHours < 5) return `${diffHours} ч назад`;
    return `${diffHours} ч назад`;
  }
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AuditComments({ responseId, userId, userName }: AuditCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Fetch comments ─────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?responseId=${responseId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ─── Auto-scroll to bottom on new comments ──────────────────────────────

  useEffect(() => {
    if (comments.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  // ─── Submit comment ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          content: trimmed,
          userId,
        }),
      });

      if (res.ok) {
        const newCommentData: Comment = await res.json();
        setComments((prev) => [...prev, newCommentData]);
        setNewComment('');
        textareaRef.current?.focus();
      } else {
        const errData = await res.json();
        toast.error('Ошибка', { description: errData.error || 'Не удалось добавить комментарий' });
      }
    } catch {
      toast.error('Ошибка', { description: 'Не удалось добавить комментарий' });
    } finally {
      setSubmitting(false);
    }
  }, [newComment, submitting, responseId, userId]);

  // ─── Delete comment ─────────────────────────────────────────────────────

  const handleDelete = useCallback(async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/comments?id=${commentId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success('Комментарий удалён');
      } else {
        const errData = await res.json();
        toast.error('Ошибка', { description: errData.error || 'Не удалось удалить комментарий' });
      }
    } catch {
      toast.error('Ошибка', { description: 'Не удалось удалить комментарий' });
    } finally {
      setDeletingId(null);
    }
  }, [userId]);

  // ─── Keyboard submit ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-500" />
            Комментарии
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shimmer w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3.5 w-24 rounded" />
                <div className="shimmer h-14 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shimmer w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3.5 w-32 rounded" />
                <div className="shimmer h-10 w-3/4 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="shimmer h-10 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-500" />
              Комментарии
              {comments.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({comments.length})
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Обсуждение результатов аудита
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ─── Comments List ─────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="max-h-96 overflow-y-auto space-y-1 custom-scrollbar"
        >
          <AnimatePresence initial={false}>
            {comments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-muted-foreground"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium">Пока нет комментариев</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Будьте первым, кто оставит комментарий
                </p>
              </motion.div>
            ) : (
              comments.map((comment, idx) => {
                const isAuthor = comment.userId === userId;
                const avatarColor = getAvatarColor(comment.author.id);

                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                      delay: idx === comments.length - 1 ? 0.05 : 0,
                    }}
                    className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    {/* Avatar */}
                    <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
                      <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate">
                          {comment.author.name}
                        </span>
                        {comment.author.role === 'ADMIN' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 font-medium">
                            Админ
                          </span>
                        )}
                        <span
                          className="text-xs text-muted-foreground ml-auto flex-shrink-0"
                          title={formatFullTime(comment.createdAt)}
                        >
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>

                    {/* Delete button (only for author) */}
                    {isAuthor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        title="Удалить комментарий"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* ─── Input Area ─────────────────────────────────────────────── */}
        <div className="flex items-end gap-3 pt-2 border-t">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className={`text-xs font-bold ${getAvatarColor(userId)}`}>
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать комментарий..."
              className="min-h-[42px] max-h-[120px] resize-none pr-12 rounded-xl text-sm"
              rows={1}
            />
          </div>
          <Button
            size="icon"
            className="h-[42px] w-[42px] rounded-xl flex-shrink-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm disabled:opacity-40 transition-all"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            title="Отправить (Ctrl+Enter)"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Submit hint */}
        <p className="text-[10px] text-muted-foreground/60 text-right -mt-2">
          Ctrl+Enter для отправки
        </p>
      </CardContent>
    </Card>
  );
}
