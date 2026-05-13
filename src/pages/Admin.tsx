import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus,
  Edit2,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  BarChart3,
  FileText,
  CheckCircle2,
  LayoutGrid,
} from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales } from '../i18n';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { ApiPost, postsApi } from '../api/posts';

type PostStatus = 'published' | 'draft';

type AdminPost = {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  category: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
};

function mapApiPost(post: ApiPost): AdminPost {
  return {
    id: String(post.id),
    title: post.title,
    content: post.content,
    imageUrl: post.image_url ?? '',
    category: post.category ?? '',
    status: 'published',
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

function normalizeDate(value: string): string {
  if (value.includes('T')) {
    return value;
  }
  return value.replace(' ', 'T');
}

export default function Admin() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const postsPerPage = 10;
  const navigate = useNavigate();
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        await authApi.me();
        const result = await postsApi.list(0, 200);
        if (!cancelled) {
          setPosts(result.map(mapApiPost));
          setError('');
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        if (requestError instanceof ApiError && requestError.status === 401) {
          navigate('/login');
          return;
        }
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError(t.login.error);
        }
      }
    };

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [navigate, t.login.error]);

  const stats = useMemo(() => {
    return {
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      drafts: posts.filter((post) => post.status === 'draft').length,
      categories: new Set(posts.map((post) => post.category)).size,
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const formatPostDate = (value: string) => {
    const date = new Date(normalizeDate(value));
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, formats.medium, { locale });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.confirmDelete)) {
      return;
    }

    try {
      await postsApi.remove(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
      setError('');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        navigate('/login');
        return;
      }
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(t.login.error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(t.login.error);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.admin.title}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.admin.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/edit"
            className="inline-flex items-center px-4 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 mr-2" /> {t.admin.newPost}
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-sm font-semibold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" /> {t.admin.logout}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {[
          { label: t.admin.stats.total, value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          {
            label: t.admin.stats.published,
            value: stats.published,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: t.admin.stats.drafts,
            value: stats.drafts,
            icon: BarChart3,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
          },
          {
            label: t.admin.stats.categories,
            value: stats.categories,
            icon: LayoutGrid,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className={`p-2 w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t.admin.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/10 focus:border-zinc-900 transition-all text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PostStatus | 'all')}
              className="flex-1 sm:flex-none bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-900 transition-all text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">{t.admin.allStatus}</option>
              <option value="published">{t.admin.statusPublished}</option>
              <option value="draft">{t.admin.statusDraft}</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.admin.table.title}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.admin.table.image}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.admin.table.status}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.admin.table.category}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.admin.table.date}</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t.admin.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    {t.admin.table.empty}
                  </td>
                </tr>
              )}
              {paginatedPosts.map((post) => (
                <tr key={post.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{post.title}</td>
                  <td className="px-6 py-4">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt={post.title} className="h-10 w-16 object-cover rounded-md border border-zinc-200 dark:border-zinc-700" />
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {post.status === 'published' ? t.admin.statusPublished : t.admin.statusDraft}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{post.category || t.post.general}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">{formatPostDate(post.createdAt)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      to={`/admin/edit/${post.id}`}
                      className="inline-flex p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => void handleDelete(post.id)}
                      className="inline-flex p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white dark:bg-zinc-950 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {t.home.previous}
          </button>

          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-zinc-900 text-white shadow-md'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t.home.next} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
