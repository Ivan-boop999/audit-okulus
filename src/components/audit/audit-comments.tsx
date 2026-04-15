'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Clock, Trash2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  id: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHour < 24) return `${diffHour} ч. назад`;
  if (diffDay < 7) return `${diffDay} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const commentVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditComments({ responseId, userId, userName }: AuditCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Fetch comments ───────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?responseId=${responseId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setComments(data);
    } catch {
      // Silent fail for comments
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  // ─── Submit comment ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          content: newComment,
          userId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create comment');

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      toast.success('Комментарий добавлен');
    } catch {
      toast.error('Не удалось добавить комментарий');
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  // ─── Delete comment ───────────────────────────────────────────────────────

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Комментарий удалён');
    } catch {
      toast.error('Не удалось удалить комментарий');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Keyboard shortcut ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Комментарии</CardTitle>
              {comments.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {comments.length} {comments.length === 1 ? 'комментарий' : comments.length < 5 ? 'комментария' : 'комментариев'}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Comments list */}
        <div ref={scrollRef} className="max-h-80 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="shimmer w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="shimmer h-3.5 w-20 rounded" />
                      <div className="shimmer h-3 w-14 rounded" />
                    </div>
                    <div className="shimmer h-4 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Пока нет комментариев</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Будьте первым!</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {comments.map((comment) => {
                const isOwn = comment.userId === userId;
                const avatarColor = getAvatarColor(comment.author.name);

                return (
                  <motion.div
                    key={comment.id}
                    variants={commentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={`flex gap-2.5 p-2.5 rounded-lg transition-colors ${
                      isOwn
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarFallback className={`text-[10px] font-bold ${avatarColor}`}>
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${isOwn ? 'text-primary' : 'text-foreground'}`}>
                          {isOwn ? 'Вы' : comment.author.name}
                        </span>
                        {comment.author.role === 'ADMIN' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                            Админ
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Input area */}
        <div className="relative flex gap-2 pt-2 border-t">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className={`text-[10px] font-bold ${getAvatarColor(userName)}`}>
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать комментарий..."
              className="min-h-[40px] max-h-32 resize-none text-sm bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="h-9 w-9 flex-shrink-0 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm border-0 disabled:opacity-40"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="absolute -bottom-4 right-12 text-[10px] text-muted-foreground/50">
            ⌘+Enter для отправки
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
