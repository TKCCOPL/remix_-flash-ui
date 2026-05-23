import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Search,
  FileText,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales } from '../i18n';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { ApiPost, postsApi } from '../api/posts';

type AdminPost = {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  category: string;
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
        const result = await postsApi.list(0, 100);
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

  const categories = useMemo(() => {
    return [...new Set(posts.map((post) => post.category).filter(Boolean))].sort();
  }, [posts]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthlyCount = posts.filter((post) => {
      const d = new Date(normalizeDate(post.createdAt));
      return d >= monthStart && d <= monthEnd;
    }).length;
    return {
      total: posts.length,
      categories: new Set(posts.map((post) => post.category).filter(Boolean)).size,
      monthly: monthlyCount,
    };
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    let result = posts.filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(normalizeDate(a.createdAt)).getTime() - new Date(normalizeDate(b.createdAt)).getTime();
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return new Date(normalizeDate(b.createdAt)).getTime() - new Date(normalizeDate(a.createdAt)).getTime();
      }
    });

    return result;
  }, [posts, searchQuery, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedPosts.length / postsPerPage);
  const paginatedPosts = filteredAndSortedPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const allOnPageSelected = paginatedPosts.length > 0 && paginatedPosts.every((post) => selectedIds.has(post.id));
  const someOnPageSelected = paginatedPosts.some((post) => selectedIds.has(post.id));

  const formatPostDate = (value: string) => {
    const date = new Date(normalizeDate(value));
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, formats.medium, { locale });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedPosts.forEach((post) => next.delete(post.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedPosts.forEach((post) => next.add(post.id));
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.confirmDelete)) {
      return;
    }

    try {
      await postsApi.remove(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(t.admin.batch.confirm.replace('{count}', String(ids.length)))) {
      return;
    }

    try {
      const results = await Promise.allSettled(
        ids.map((id) => postsApi.remove(id))
      );
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        const firstFailure = failures[0] as PromiseRejectedResult;
        const err = firstFailure.reason;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login');
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : t.login.error
        );
      }
      const succeededIds = new Set(
        ids.filter((_, i) => results[i].status === 'fulfilled')
      );
      setPosts((prev) => prev.filter((post) => !succeededIds.has(post.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
      if (failures.length === 0) setError('');
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

  const statCards = [
    {
      label: t.admin.stats.total,
      value: stats.total,
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      darkBg: 'dark:bg-indigo-950/40',
      darkColor: 'dark:text-indigo-400',
    },
    {
      label: t.admin.stats.categories,
      value: stats.categories,
      icon: LayoutGrid,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      darkBg: 'dark:bg-purple-950/40',
      darkColor: 'dark:text-purple-400',
    },
    {
      label: t.admin.stats.monthly,
      value: stats.monthly,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      darkBg: 'dark:bg-emerald-950/40',
      darkColor: 'dark:text-emerald-400',
    },
  ];

  return (
    <div className="w-full">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{t.admin.title}</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">{t.admin.subtitle}</p>
        </div>
        <Link
          to="/admin/edit"
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> {t.admin.newPost}
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl p-8 rounded-3xl border border-stone-200/50 dark:border-stone-800/50 shadow-sm animate-fade-in-up stagger-item"
            style={{ '--stagger-index': i + 1 } as React.CSSProperties}
          >
            <div
              className={`p-2 w-10 h-10 rounded-xl ${stat.bg} ${stat.darkBg} ${stat.color} ${stat.darkColor} flex items-center justify-center mb-4`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{stat.label}</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': statCards.length + 1 } as React.CSSProperties}
      >
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={t.admin.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-stone-900 dark:text-stone-100"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-2xl text-sm text-stone-700 dark:text-stone-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none pr-8"
          >
            <option value="all">{t.admin.filter.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-2xl text-sm text-stone-700 dark:text-stone-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none pr-8"
          >
            <option value="newest">{t.admin.sort.newest}</option>
            <option value="oldest">{t.admin.sort.oldest}</option>
            <option value="titleAsc">{t.admin.sort.titleAsc}</option>
            <option value="titleDesc">{t.admin.sort.titleDesc}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="space-y-4 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': statCards.length + 2 } as React.CSSProperties}
      >
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-3xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]" aria-label="Posts management table">
            <thead>
              <tr className="bg-stone-50/50 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                    }}
                    onChange={toggleSelectAll}
                    aria-label="Select all posts"
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {t.admin.table.title}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {t.admin.table.image}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {t.admin.table.category}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {t.admin.table.date}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-right">
                  {t.admin.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {paginatedPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                    {t.admin.table.empty}
                  </td>
                </tr>
              )}
              {paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className={`hover:bg-stone-50/30 dark:hover:bg-stone-900/60 transition-colors ${
                    selectedIds.has(post.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <td className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      aria-label={`Select post: ${post.title}`}
                      className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">{post.title}</td>
                  <td className="px-6 py-4">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-10 w-16 object-cover rounded-md border border-stone-200 dark:border-stone-700"
                      />
                    ) : (
                      <span className="text-xs text-stone-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                    {post.category || t.post.general}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                    {formatPostDate(post.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      to={`/admin/edit/${post.id}`}
                      className="inline-flex p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-900 rounded-lg transition-all border border-transparent hover:border-stone-100 dark:hover:border-stone-700"
                      aria-label="Edit post"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => void handleDelete(post.id)}
                      className="inline-flex p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                      aria-label="Delete post"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white dark:bg-stone-900 px-6 py-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-900'
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t.home.next} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Batch operations bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-stone-900 dark:bg-stone-800 text-white rounded-2xl shadow-xl border border-stone-700 dark:border-stone-600">
          <span className="text-sm font-medium">
            {t.admin.batch.selected.replace('{count}', String(selectedIds.size))}
          </span>
          <button
            onClick={() => void handleBatchDelete()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.admin.batch.delete}
          </button>
        </div>
      )}
    </div>
  );
}
