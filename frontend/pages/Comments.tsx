import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Check, X, Trash2, MoreHorizontal } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { adminCommentsApi, AdminComment } from '../api/admin';

export default function Comments() {
  const t = useI18n();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await adminCommentsApi.list({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setComments(res.comments);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchComments();
  }, [statusFilter]);

  const handleSearch = () => {
    void fetchComments();
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await adminCommentsApi.updateStatus(id, status);
      void fetchComments();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminCommentsApi.remove(id);
      void fetchComments();
    } catch {
      // ignore
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminCommentsApi.batchDelete(selectedIds);
      setSelectedIds([]);
      void fetchComments();
    } catch {
      // ignore
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {t.admin.comments.title}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {t.admin.comments.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t.admin.comments.batch.delete} ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={t.admin.comments.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-stone-900 dark:text-stone-100 placeholder-stone-400"
          />
        </div>
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
          {[
            { value: '', label: t.admin.comments.filter.all },
            { value: 'pending', label: t.admin.comments.filter.pending },
            { value: 'approved', label: t.admin.comments.filter.approved },
            { value: 'rejected', label: t.admin.comments.filter.rejected },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === filter.value
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900/50 rounded-2xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-stone-400 animate-pulse">{t.admin.comments.loading}</div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-stone-500 dark:text-stone-400">{t.admin.comments.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200/50 dark:border-stone-800/50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === comments.length}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? comments.map((c) => c.id) : [])
                      }
                      className="rounded border-stone-300 dark:border-stone-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.user}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.content}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.post}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.status}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.time}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {t.admin.comments.table.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                {comments.map((comment) => (
                  <tr
                    key={comment.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(comment.id)}
                        onChange={() => toggleSelect(comment.id)}
                        className="rounded border-stone-300 dark:border-stone-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {comment.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                            {comment.username}
                          </p>
                          <p className="text-xs text-stone-400">{comment.oauth_provider}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-700 dark:text-stone-300 line-clamp-2 max-w-md">
                        {comment.content}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-600 dark:text-stone-400 truncate max-w-[200px]">
                        {comment.post_title}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[comment.status]}`}
                      >
                        {t.admin.comments.status[comment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(comment.id, 'approved')}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-colors"
                            title={t.admin.comments.actions.approve}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {comment.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(comment.id, 'rejected')}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title={t.admin.comments.actions.reject}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title={t.admin.comments.actions.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
