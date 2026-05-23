import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales } from '../i18n';
import { ApiError } from '../api/client';
import { ApiPost, postsApi } from '../api/posts';
import { getCached, setCache } from '../api/cache';

function normalizeDate(value: string): string {
  if (value.includes('T')) return value;
  return value.replace(' ', 'T');
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ApiPost | null>(() => getCached<ApiPost>(`post_${id}`));
  const [loading, setLoading] = useState(() => !getCached(`post_${id}`));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];

  useEffect(() => {
    let cancelled = false;

    const loadPost = async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }

      try {
        const response = await postsApi.get(id);
        if (!cancelled) {
          setPost(response);
          setCache(`post_${id}`, response);
          setNotFound(false);
        }
      } catch (requestError) {
        if (!cancelled) {
          if (requestError instanceof ApiError && requestError.status === 404) {
            setNotFound(true);
          } else {
            setError(requestError instanceof Error ? requestError.message : '加载失败');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPost();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-4 text-stone-900 dark:text-stone-100">{error}</h2>
        <Link to="/" className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 underline">
          {t.post.returnHome}
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-4 text-stone-900 dark:text-stone-100">{t.post.notFound}</h2>
        <Link to="/" className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 underline">
          {t.post.returnHome}
        </Link>
      </div>
    );
  }

  const createdAt = post ? new Date(normalizeDate(post.created_at)) : null;

  return (
    <article className="w-full max-w-3xl mx-auto">
      <header className="mb-14">
        {/* 返回按钮：始终可见，不受 loading 影响 */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.post.backToPosts}
        </button>

        {loading ? (
          /* 骨架屏：与真实 header 结构对齐，避免布局跳动 */
          <div className="animate-pulse">
            <div className="flex items-center gap-x-4 mb-6">
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-24" />
              <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded-full w-20" />
            </div>
            <div className="h-12 bg-stone-200 dark:bg-stone-700 rounded w-full mb-3" />
            <div className="h-12 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {post!.image_url && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 animate-fade-in-scale">
                <img src={post!.image_url} alt={post!.title} className="w-full max-h-[440px] object-cover" />
              </div>
            )}
            <div className="flex items-center gap-x-4 text-sm mb-6">
              <time dateTime={post!.created_at} className="text-stone-500 dark:text-stone-400">
                {createdAt && !Number.isNaN(createdAt.getTime())
                  ? format(createdAt, formats.long, { locale })
                  : post!.created_at}
              </time>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 font-medium text-indigo-600 dark:text-indigo-400">
                {post!.category || t.post.general}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-4 leading-tight">
              {post!.title}
            </h1>
          </div>
        )}
      </header>

      {/* 正文骨架屏 */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-11/12" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-4/5" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-9/12" />
          <div className="h-8" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-10/12" />
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
        </div>
      ) : (
        <div className="prose prose-stone w-full max-w-none animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <Markdown remarkPlugins={[remarkGfm]}>{post!.content}</Markdown>
        </div>
      )}
    </article>
  );
}
