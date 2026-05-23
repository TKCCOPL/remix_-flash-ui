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
  status: 'published' | 'draft';
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
    status: post.status,
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

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{t.admin.title}</h1>
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-2 flex items-center gap-2.5">
            <span>{stats.total} 篇文章</span>
            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
            <span>{stats.categories} 个分类</span>
            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
            <span>本月新增 {stats.monthly} 篇</span>
          </div>
        </div>
        <Link
          to="/admin/edit"
          className="inline-flex items-center px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-100 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> {t.admin.newPost}
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* Categories Pill Tabs */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': 1 } as React.CSSProperties}
      >
        <button
          onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            categoryFilter === 'all' 
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md' 
              : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          {t.admin.filter.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              categoryFilter === cat 
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md' 
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/50 dark:border-stone-800/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter bar (Search & Sort) */}
      <div
        className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6 animate-fade-in-up stagger-item"
        style={{ '--stagger-index': 2 } as React.CSSProperties}
      >
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={t.admin.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-6 pr-4 py-2 bg-transparent border-b border-stone-200/50 dark:border-stone-800/50 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>
        <div className="flex w-full sm:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-transparent text-sm font-medium text-stone-500 dark:text-stone-400 outline-none hover:text-stone-900 dark:hover:text-stone-100 transition-colors appearance-none cursor-pointer"
          >
            <option value="newest" className="dark:bg-stone-900">{t.admin.sort.newest}</option>
            <option value="oldest" className="dark:bg-stone-900">{t.admin.sort.oldest}</option>
            <option value="titleAsc" className="dark:bg-stone-900">{t.admin.sort.titleAsc}</option>
            <option value="titleDesc" className="dark:bg-stone-900">{t.admin.sort.titleDesc}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="animate-fade-in-up stagger-item pb-20"
        style={{ '--stagger-index': 3 } as React.CSSProperties}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]" aria-label="Posts management table">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <th className="px-2 py-3 w-10">
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
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {t.admin.table.title}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {t.admin.table.image}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {t.admin.table.category}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {t.admin.table.date}
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">
                  {t.admin.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/50 dark:divide-stone-800/50">
              {paginatedPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-500 dark:text-stone-400">
                    {t.admin.table.empty}
                  </td>
                </tr>
              )}
              {paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className={`group hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors ${
                    selectedIds.has(post.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <td className="px-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(post.id)}
                      onChange={() => toggleSelect(post.id)}
                      aria-label={`Select post: ${post.title}`}
                      className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-sm text-stone-900 dark:text-stone-100 flex items-center">
                    {post.title}
                    {post.status === 'draft' && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 rounded">
                        草稿
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-8 w-12 object-cover rounded border border-stone-200 dark:border-stone-800"
                      />
                    ) : (
                      <span className="text-xs text-stone-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
                    {post.category || t.post.general}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
                    {formatPostDate(post.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/admin/edit/${post.id}`}
                      className="inline-flex p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-all"
                      aria-label="Edit post"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => void handleDelete(post.id)}
                      className="inline-flex p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
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
