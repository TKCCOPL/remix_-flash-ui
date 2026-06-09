import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users as UsersIcon, Trash2, Eye, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { adminApi, AdminUser } from '../api/admin';
import UserDetailModal from '../components/UserDetailModal';

const roleColors: Record<string, string> = {
  admin: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400',
  editor: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  author: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  guest: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
};

const assignableRoles = ['guest', 'author', 'editor'] as const;

export default function Users() {
  const t = useI18n();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const usersPerPage = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const skip = (currentPage - 1) * usersPerPage;
      const data = await adminApi.getUsers({
        skip,
        limit: usersPerPage,
        search: searchQuery || undefined,
        provider: providerFilter || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login');
        return;
      }
      setError(err instanceof Error ? err.message : t.login.error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, providerFilter, navigate, t.login.error]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await authApi.me();
        if (!cancelled) {
          void loadUsers();
        }
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [navigate, loadUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, providerFilter]);

  const handleDelete = async (userId: number) => {
    try {
      await adminApi.deleteUser(userId);
      void loadUsers();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

  const totalPages = Math.ceil(total / usersPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t.admin.users.title}</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">{t.admin.users.subtitle}</p>
        </div>
        <div className="bg-white dark:bg-stone-800 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700">
          <span className="text-stone-500 dark:text-stone-400">
            {t.admin.users.totalUsers.replace('{count}', String(total))}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder={t.admin.users.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: '', label: t.admin.users.filter.all },
              { value: 'github', label: t.admin.users.filter.github },
              { value: 'gitee', label: t.admin.users.filter.gitee },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setProviderFilter(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  providerFilter === filter.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-stone-400 animate-pulse">{t.admin.users.loading}</div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
            <UsersIcon className="w-12 h-12 mb-4 opacity-50" />
            <div>{t.admin.users.empty}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.user}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.role}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.email}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.provider}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.registeredAt}</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.comments}</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.favorites}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500 dark:text-stone-400">{t.admin.users.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                            {user.username.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-stone-900 dark:text-stone-100">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[user.role] || roleColors.guest}`}>
                          {user.role}
                        </span>
                        {user.role !== 'admin' && (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-500 dark:text-stone-400">{user.email || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${providerColor(user.oauth_provider)}`}>
                        {providerLabel(user.oauth_provider)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-500 dark:text-stone-400">{formatDate(user.created_at)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium">
                        {user.comment_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                        {user.favorite_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedUserId(user.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors" title={t.admin.users.actions.detail}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(user)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title={t.admin.users.actions.delete}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-stone-200 dark:border-stone-800">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-indigo-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'}`}>
                  {page}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
              下一页
            </button>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} onDelete={handleDelete} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{t.admin.users.actions.deleteUser}</h3>
              <p className="text-stone-600 dark:text-stone-400 mb-6">{t.admin.users.confirm.delete.replace('{username}', deleteConfirm.username)}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">取消</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">{t.admin.users.actions.delete}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
