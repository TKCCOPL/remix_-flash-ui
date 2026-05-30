import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { adminApi, AdminUserDetail } from '../api/admin';

type UserDetailModalProps = {
  userId: number | null;
  onClose: () => void;
  onDelete: (userId: number) => void;
};

export default function UserDetailModal({ userId, onClose, onDelete }: UserDetailModalProps) {
  const t = useI18n();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminApi.getUserDetail(userId);
        if (!cancelled) {
          setDetail(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const providerLabel = (provider: string) => {
    switch (provider) {
      case 'github': return 'GitHub';
      case 'gitee': return 'Gitee';
      default: return provider;
    }
  };

  const providerColor = (provider: string) => {
    switch (provider) {
      case 'github': return 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300';
      case 'gitee': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
      default: return 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {t.admin.users.detail.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-stone-400 animate-pulse">{t.admin.users.loading}</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-red-500">{error}</div>
              </div>
            ) : detail ? (
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-start gap-4">
                  {detail.user.avatar_url ? (
                    <img src={detail.user.avatar_url} alt={detail.user.username} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                      {detail.user.username.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">{detail.user.username}</div>
                    <div className="text-stone-500 dark:text-stone-400 mt-1">{detail.user.email || '-'}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${providerColor(detail.user.oauth_provider)}`}>
                        {providerLabel(detail.user.oauth_provider)}
                      </span>
                      <span className="text-stone-400 text-sm">
                        {t.admin.users.table.registeredAt} {formatDate(detail.user.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { onDelete(userId); onClose(); }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    {t.admin.users.actions.deleteUser}
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{detail.stats.comment_count}</div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t.admin.users.detail.stats.comments}</div>
                  </div>
                  <div className="text-center p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{detail.stats.favorite_count}</div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t.admin.users.detail.stats.favorites}</div>
                  </div>
                  <div className="text-center p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{detail.stats.active_days}</div>
                    <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t.admin.users.detail.stats.activeDays}</div>
                  </div>
                </div>

                {/* Recent Comments */}
                {detail.recent_comments.length > 0 && (
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-100 mb-3">{t.admin.users.detail.recentComments}</div>
                    <div className="space-y-3">
                      {detail.recent_comments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-indigo-600 dark:text-indigo-400">{comment.post_title}</span>
                            <span className="text-xs text-stone-400">{formatDate(comment.created_at)}</span>
                          </div>
                          <div className="text-sm text-stone-700 dark:text-stone-300">{comment.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
