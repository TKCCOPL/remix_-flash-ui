import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, MessageCircle, Folder, Eye, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { adminStatsApi, type StatsOverview, type CommentsTrend, type PopularPost, type CategoryDistribution, type ViewsTrendResponse } from '../api/admin';

export default function Stats() {
  const t = useI18n();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<CommentsTrend[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [viewsTrend, setViewsTrend] = useState<ViewsTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        await authApi.me();
        const [overviewData, trendData, postsData, catData, viewsTrendData] = await Promise.all([
          adminStatsApi.overview(),
          adminStatsApi.commentsTrend(),
          adminStatsApi.popularPosts(),
          adminStatsApi.categoryDistribution(),
          adminStatsApi.viewsTrend(30),
        ]);
        if (!cancelled) {
          setOverview(overviewData);
          setTrend(trendData.trend);
          setPopularPosts(postsData.posts);
          setCategories(catData.categories);
          setViewsTrend(viewsTrendData);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            navigate('/login');
            return;
          }
          setError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-stone-400 animate-pulse">{t.admin.stats.noData}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const maxTrendCount = Math.max(...trend.map(d => d.count), 1);
  const maxCategoryCount = Math.max(...categories.map(c => c.count), 1);

  const statCards = [
    { icon: FileText, label: t.admin.stats.overview.posts, value: overview?.post_count ?? 0, color: 'text-indigo-600 dark:text-indigo-400' },
    { icon: Users, label: t.admin.stats.overview.users, value: overview?.user_count ?? 0, color: 'text-green-600 dark:text-green-400' },
    { icon: MessageCircle, label: t.admin.stats.overview.comments, value: overview?.comment_count ?? 0, color: 'text-amber-600 dark:text-amber-400' },
    { icon: Eye, label: t.admin.stats.overview.views, value: overview?.total_views ?? 0, color: 'text-cyan-600 dark:text-cyan-400' },
    { icon: Heart, label: t.admin.stats.overview.favorites, value: overview?.total_favorites ?? 0, color: 'text-rose-600 dark:text-rose-400' },
    { icon: Folder, label: t.admin.stats.overview.categories, value: overview?.category_count ?? 0, color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t.admin.stats.title}</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">{t.admin.stats.subtitle}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Comments Trend */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t.admin.stats.commentsTrend}</h2>
        {trend.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t.admin.stats.noData}</div>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {trend.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t"
                  style={{ height: `${(day.count / maxTrendCount) * 100}%`, minHeight: '4px' }}
                  title={`${day.date}: ${day.count}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Views Trend */}
      {viewsTrend && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t.admin.stats.viewsTrend}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t.admin.stats.totalViews}</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{viewsTrend.total_views}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t.admin.stats.avgDaily}</p>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{viewsTrend.avg_daily}</p>
            </div>
          </div>
          {viewsTrend.trend.length === 0 ? (
            <div className="text-center py-8 text-stone-400">{t.admin.stats.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viewsTrend.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#a8a29e" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a8a29e" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#292524',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fafaf9',
                  }}
                />
                <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Popular Posts & Category Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Popular Posts */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t.admin.stats.popularPosts}</h2>
          {popularPosts.length === 0 ? (
            <div className="text-center py-8 text-stone-400">{t.admin.stats.noData}</div>
          ) : (
            <div className="space-y-3">
              {popularPosts.map((post, i) => (
                <div key={post.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-600 dark:text-stone-300">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-stone-800 dark:text-stone-200">{post.title}</span>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span>{post.view_count} {t.admin.stats.overview.views}</span>
                    <span>{post.comment_count} {t.admin.stats.overview.comments}</span>
                    <span>{post.like_count} {t.admin.stats.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{t.admin.stats.categoryDistribution}</h2>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-stone-400">{t.admin.stats.noData}</div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-800 dark:text-stone-200">{cat.category}</span>
                    <span className="text-stone-400">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 dark:bg-purple-400 rounded-full"
                      style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
