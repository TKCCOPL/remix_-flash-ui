import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales } from '../i18n';
import { ApiError } from '../api/client';
import { ApiPost, postsApi } from '../api/posts';

function normalizeDate(value: string): string {
  if (value.includes('T')) {
    return value;
  }
  return value.replace(' ', 'T');
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];

  useEffect(() => {
    let cancelled = false;

    const loadPost = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const response = await postsApi.get(id);
        if (!cancelled) {
          setPost(response);
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-24 text-stone-500 dark:text-stone-400">
        ...
      </div>
    );
  }

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

  if (notFound || !post) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-4 text-stone-900 dark:text-stone-100">{t.post.notFound}</h2>
        <Link to="/" className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 underline">
          {t.post.returnHome}
        </Link>
      </div>
    );
  }

  const createdAt = new Date(normalizeDate(post.created_at));

  return (
    <article className="w-full max-w-3xl mx-auto">
      <header className="mb-14">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.post.backToPosts}
        </Link>
        {post.image_url && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
            <img src={post.image_url} alt={post.title} className="w-full max-h-[440px] object-cover" />
          </div>
        )}
        <div className="flex items-center gap-x-4 text-sm mb-6">
          <time dateTime={post.created_at} className="text-stone-500 dark:text-stone-400">
            {Number.isNaN(createdAt.getTime()) ? post.created_at : format(createdAt, formats.long, { locale })}
          </time>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 font-medium text-indigo-600 dark:text-indigo-400">
            {post.category || t.post.general}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-4 leading-tight">
          {post.title}
        </h1>
      </header>

      <div className="prose prose-stone w-full max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </Markdown>
      </div>
    </article>
  );
}
