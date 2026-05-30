import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Trash2, Send, Reply } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { commentsApi, type Comment } from '../api/comments';
import { dateFormats, locales } from '../i18n';
import OAuthMenu from './OAuthMenu';
import { normalizeDate } from '../utils/date';

type CommentSectionProps = {
  postId: number;
};

export default function CommentSection({ postId }: CommentSectionProps) {
  const t = useI18n();
  const { language } = usePreferences();
  const { user, loading: authLoading } = useAuth();
  const locale = locales[language];
  const formats = dateFormats[language];

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showOAuthMenu, setShowOAuthMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const data = await commentsApi.list(postId);
      setComments(data);
    } catch {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const newComment = await commentsApi.create(postId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setContent('');
    } catch {
      setSubmitError(t.oauth.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (deletingId !== null) return;
    if (!window.confirm(t.oauth.deleteCommentConfirm)) return;

    setDeletingId(commentId);
    try {
      await commentsApi.remove(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setSubmitError(t.oauth.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = async (parentId: number) => {
    const trimmed = replyContent.trim();
    if (!trimmed || replySubmitting) return;

    setReplySubmitting(true);
    try {
      await commentsApi.create(postId, trimmed, parentId);
      setReplyContent('');
      setReplyingTo(null);
      await loadComments();
    } catch {
      setSubmitError(t.oauth.submitError);
    } finally {
      setReplySubmitting(false);
    }
  };

  const canDelete = (comment: Comment) => {
    if (!user) return false;
    if (user.id != null) return user.id === comment.user_id;
    return true;
  };

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(normalizeDate(dateStr));
    if (Number.isNaN(date.getTime())) return dateStr;
    return format(date, formats.medium, { locale });
  };

  return (
    <section className="mt-16 pt-10 border-t border-stone-200/60 dark:border-stone-800/60">
      <h2 className="flex items-center gap-2 text-xl font-bold text-stone-800 dark:text-stone-100 mb-8">
        <MessageCircle className="w-5 h-5" />
        {t.oauth.commentsTitle}
      </h2>

      {authLoading ? (
        <div className="mb-10 animate-pulse">
          <div className="h-24 rounded-2xl bg-stone-200 dark:bg-stone-700" />
        </div>
      ) : user ? (
        <div className="mb-10">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.oauth.commentPlaceholder}
            maxLength={1000}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm"
          />
          <div className="flex items-center justify-between mt-3">
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {content.length}/1000
              </span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? t.oauth.submitting : t.oauth.submitComment}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-10 p-6 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
            {t.oauth.loginPrompt}
          </p>
          <button
            onClick={() => setShowOAuthMenu(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
          >
            {t.oauth.login}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-24" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">
          {t.oauth.noComments}
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <img
                src={comment.avatar_url || '/avatar.png'}
                alt={comment.username}
                className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                    {comment.username}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {formatCommentDate(comment.created_at)}
                  </span>
                  {canDelete(comment) && (
                    <button
                      onClick={() => void handleDelete(comment.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title={t.oauth.deleteComment}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
                      title={t.oauth.reply}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                {replyingTo === comment.id && (
                  <div className="mt-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t.oauth.replyPlaceholder(comment.username)}
                      maxLength={1000}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => void handleReply(comment.id)}
                        disabled={!replyContent.trim() || replySubmitting}
                        className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 disabled:opacity-40"
                      >
                        {replySubmitting ? t.oauth.replySubmitting : t.oauth.replySubmit}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                        className="px-3 py-1.5 text-stone-500 text-xs rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        {t.oauth.cancel}
                      </button>
                    </div>
                  </div>
                )}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-stone-200 dark:border-stone-700 space-y-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 group">
                        <img
                          src={reply.avatar_url || '/avatar.png'}
                          alt={reply.username}
                          className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                              {reply.username}
                            </span>
                            <span className="text-xs text-stone-400">
                              {formatCommentDate(reply.created_at)}
                            </span>
                            {canDelete(reply) && (
                              <button
                                onClick={() => void handleDelete(reply.id)}
                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-full text-stone-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <OAuthMenu open={showOAuthMenu} onClose={() => setShowOAuthMenu(false)} />
    </section>
  );
}
