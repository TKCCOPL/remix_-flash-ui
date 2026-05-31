import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import throttle from 'lodash.throttle';
import GithubSlugger from 'github-slugger';
import { ArrowLeft, List, MessageSquare } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales } from '../i18n';
import { ApiError } from '../api/client';
import { ApiPost, postsApi } from '../api/posts';
import { getCached, setCache } from '../api/cache';
import CommentSection from '../components/CommentSection';
import FavoriteButton from '../components/FavoriteButton';
import SEO from '../components/SEO';
import { normalizeDate } from '../utils/date';

interface TocItem {
  id: string;
  title: string;
  level: number;
}

function calculateReadingTime(content: string): number {
  const words = content.length;
  const wordsPerMinute = 200; // Chinese reading speed
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;
  const slugger = new GithubSlugger();
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    let title = match[2].trim();
    
    // Remove basic markdown from title for display and slugging
    const cleanTitle = title
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
      
    const id = slugger.slug(cleanTitle);
    toc.push({ id, title: cleanTitle, level });
  }
  return toc;
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ApiPost | null>(() => getCached<ApiPost>(`post_${id}`));
  const [loading, setLoading] = useState(() => !getCached(`post_${id}`));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [activeTocId, setActiveTocId] = useState<string>('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];

  // Refresh post data (for favorite/comment updates)
  const refreshPost = useCallback(async () => {
    if (!id) return;
    try {
      const response = await postsApi.get(id);
      setPost(response);
      setCache(`post_${id}`, response);
    } catch {
      // silently ignore
    }
  }, [id]);

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

          // Increment view count only once per session
          const viewKey = `viewed_${id}`;
          if (!sessionStorage.getItem(viewKey)) {
            sessionStorage.setItem(viewKey, '1');
            postsApi.incrementView(id).catch(() => {});
          }
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

  const rawToc = useMemo(() => {
    if (!post?.content) return [];
    return extractToc(post.content);
  }, [post?.content]);

  // Filter TOC to only include items that actually exist in the DOM
  useEffect(() => {
    if (!rawToc.length) {
      setToc([]);
      return;
    }
    
    // Slight delay to ensure Markdown has fully rendered
    const timer = setTimeout(() => {
      const validToc = rawToc.filter(item => document.getElementById(item.id) !== null);
      setToc(validToc);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [rawToc, post?.content]);

  // Handle TOC scroll spy
  useEffect(() => {
    if (!toc.length) return;
    
    const handleScroll = throttle(() => {
      const headingElements = toc.map(item => document.getElementById(item.id)).filter(Boolean);
      
      let currentActiveId = '';
      for (const el of headingElements) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // If the heading is in the top 150px of the viewport or we passed it
        if (rect.top <= 150) {
          currentActiveId = el.id;
        } else {
          break; // Stop at the first heading below the threshold
        }
      }
      
      setActiveTocId(prev => prev !== currentActiveId ? currentActiveId : prev);
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on load
    handleScroll();
    
    return () => {
      handleScroll.cancel();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [toc]);

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
    <div className="w-full xl:grid xl:grid-cols-[1fr_250px] xl:gap-12 items-start relative">
      {post && (
        <SEO
          title={post.title}
          description={post.content.slice(0, 160).replace(/[#*`]/g, '')}
          image={post.image_url}
          type="article"
          publishedTime={post.created_at}
          modifiedTime={post.updated_at}
        />
      )}
      <article className="w-full max-w-3xl mx-auto xl:mx-0">
        <header className="mb-20">

          {loading ? (
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
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-800 dark:text-stone-100 mb-4 leading-tight">
                {post!.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
                <span>👁 {post!.view_count}</span>
                <span>💬 {post!.comment_count}</span>
                <span>🔖 {post!.favorite_count}</span>
                <span>⏱ {calculateReadingTime(post!.content)} min</span>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <FavoriteButton postId={post!.id} onToggle={refreshPost} />
              </div>
            </div>
          )}
        </header>

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
          <div className="prose prose-stone dark:prose-invert w-full max-w-none animate-fade-in break-words overflow-hidden" style={{ animationDelay: '0.15s' }}>
            <Markdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeSlug]}
              components={{
                img: ({ node, ...props }) => {
                  let src = props.src || '';
                  if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                    const match = post?.title.match(/\[GitHub Trending\] (.*)/);
                    if (match) {
                      const repo = match[1];
                      src = `https://raw.githubusercontent.com/${repo}/main/${src.replace(/^\//, '')}`;
                    }
                  }
                  return <img {...props} src={src} loading="lazy" />;
                }
              }}
            >
              {post!.content}
            </Markdown>
          </div>
        )}

        <div id="comments">
          {!loading && post && <CommentSection postId={post.id} onComment={refreshPost} />}
        </div>
      </article>

      {/* 侧边栏 TOC */}
      {!loading && (
        <aside className="hidden xl:block sticky top-24 pt-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-stone-50/50 dark:bg-stone-900/50 rounded-2xl p-6 border border-stone-100 dark:border-stone-800 flex flex-col gap-6 max-h-[85vh]">
            
            {/* 返回列表按钮 */}
            <Link
              to="/"
              className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.post.backToPosts}
            </Link>

            {/* 文章标题在目录区 */}
            {post && (
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-lg font-bold text-stone-800 dark:text-stone-100 leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block"
              >
                {post.title}
              </a>
            )}

            {/* 目录 */}
            {toc.length > 0 && (() => {
              const minLevel = Math.min(...toc.map(t => t.level));
              return (
                <div className="pt-2 flex flex-col overflow-hidden">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2 shrink-0">
                    <List className="w-4 h-4 text-stone-500" />
                    目录
                  </h3>
                  <ul className="space-y-2.5 text-sm overflow-y-auto pr-2 pb-2">
                    {toc.map((item) => {
                      const isActive = activeTocId === item.id;
                      return (
                        <li
                          key={item.id}
                          style={{ paddingLeft: `${(item.level - minLevel) * 12}px` }}
                        >
                          <a
                            href={`#${item.id}`}
                            title={item.title}
                            onClick={(e) => {
                              e.preventDefault();
                              const el = document.getElementById(item.id);
                              if (el) {
                                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                                window.history.pushState(null, '', `#${item.id}`);
                              }
                            }}
                            className={`block transition-colors duration-200 leading-snug truncate ${
                              isActive
                                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                            }`}
                          >
                            {item.title}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* 评论快捷按钮 */}
            <div className="pt-4 mt-auto border-t border-stone-200 dark:border-stone-700">
              <button
                onClick={() => {
                  const el = document.getElementById('comments');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                写评论
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
