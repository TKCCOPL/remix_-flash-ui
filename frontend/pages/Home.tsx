import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, type Locale } from 'date-fns';
import { ChevronRight, ArrowRight, Tag, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales, pageIndicator } from '../i18n';
import { ApiPost, postsApi } from '../api/posts';
import { getCached, setCache } from '../api/cache';
import HeroCanvas from '../components/HeroCanvas';
import SEO from '../components/SEO';
import { normalizeDate } from '../utils/date';

function formatPostDate(value: string, pattern: string, locale: Locale): string {
  const date = new Date(normalizeDate(value));
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, pattern, { locale });
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<ApiPost[]>(() => getCached<ApiPost[]>('home_posts') || []);
  const [loading, setLoading] = useState(() => !getCached('home_posts'));
  const [error, setError] = useState('');
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];
  const postsPerPage = 10;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const NONE_CATEGORY = '__none__';

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const response = await postsApi.list(0, 50);
        if (!cancelled) {
          setPosts(response);
          setCache('home_posts', response);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : t.home.empty);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
    // 数据与语言无关，不把 t 放入依赖，避免切换语言时重新 fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFiltering = !!selectedCategory;
  const featuredPost = isFiltering ? undefined : posts[0];
  const featuredImageUrl = featuredPost?.image_url?.trim() || '';
  const allListPosts = useMemo(() => {
    if (!isFiltering) return posts.slice(1);
    return posts.filter((post) => (post.category ?? NONE_CATEGORY) === selectedCategory);
  }, [posts, isFiltering, selectedCategory, NONE_CATEGORY]);
  const totalPages = Math.ceil(allListPosts.length / postsPerPage);
  const listPosts = allListPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const categories = Array.from(new Set(posts.map((post) => post.category ?? NONE_CATEGORY))).slice(0, 5);

  return (
    <div className="w-full space-y-24">
      <SEO
        title="首页"
        description="XiaoC 的个人博客，分享软件工程和界面设计的探索"
        type="website"
      />
      <HeroCanvas title={t.home.heroTitle} subtitle={t.home.heroSubtitle} titleLine2={t.home.heroTitleLine2} />

      {featuredPost && (
        <section className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{t.home.featured}</h2>
            <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
          </div>
          <motion.div
            whileHover={{ y: -4 }}
            className={`group relative ${featuredImageUrl ? 'grid md:grid-cols-2' : ''} gap-8 bg-stone-50/50 dark:bg-stone-900/60 rounded-3xl p-8 border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900/80 hover:border-stone-200 dark:hover:border-stone-700 transition-all duration-300`}
          >
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium rounded-full">
                  {featuredPost.category || t.post.general}
                </span>
                <span className="text-stone-400 text-xs">
                  {formatPostDate(featuredPost.created_at, formats.medium, locale)}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <Link to={`/post/${featuredPost.id}`}>
                  {featuredPost.title}
                </Link>
              </h3>
              <p className="text-stone-600 dark:text-stone-300 line-clamp-3 mb-6 leading-relaxed text-lg">
                {featuredPost.content.replace(/[#*`>]/g, '')}
              </p>
              <Link
                to={`/post/${featuredPost.id}`}
                className="inline-flex items-center font-semibold text-stone-900 dark:text-stone-100 hover:gap-2 transition-all"
              >
                {t.home.readFull} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
            {featuredImageUrl && (
              <div className="hidden md:block rounded-2xl bg-stone-200/50 dark:bg-stone-800/60 aspect-video overflow-hidden">
                <img
                  src={featuredImageUrl}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700"
                />
              </div>
            )}
            <Link to={`/post/${featuredPost.id}`} className="absolute inset-0 z-0" />
          </motion.div>
        </section>
      )}

      <div className="space-y-16">
        {/* Categories Tabs */}
        <section className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-wrap gap-3">
            {[t.home.all, ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat === t.home.all ? null : cat);
                  setCurrentPage(1);
                }}
                className={`px-6 py-3 text-sm font-medium rounded-full transition-all shadow-sm border ${
                  (cat === t.home.all && !selectedCategory) || selectedCategory === cat
                    ? 'text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                    : 'text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                {cat === NONE_CATEGORY ? t.post.general : cat}
              </button>
            ))}
          </div>
        </section>

        {/* Bento Grid Posts */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t.home.latest}</h2>
            <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listPosts.map((post, index) => {
              const imageUrl = post.image_url?.trim() || '';
              return (
                <article
                  key={post.id}
                  className="group relative flex flex-col bg-white dark:bg-stone-900/50 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 dark:hover:shadow-none border border-stone-100 dark:border-stone-800 transition-all duration-300 hover:-translate-y-2 stagger-item"
                  style={{ '--stagger-index': index } as React.CSSProperties}
                >
                  {imageUrl && (
                    <div className="w-full aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img src={imageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                  )}
                  
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-xs mb-5">
                      <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium rounded-lg">
                        {post.category || t.post.general}
                      </span>
                      <time dateTime={post.created_at} className="text-stone-400 font-medium">
                        {formatPostDate(post.created_at, formats.medium, locale)}
                      </time>
                    </div>
                    
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                      <Link to={`/post/${post.id}`}>
                        {post.title}
                      </Link>
                    </h3>
                    
                    <p className="line-clamp-3 text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-8 flex-1">
                      {post.content.replace(/[#*`>]/g, '')}
                    </p>
                    
                    <div className="mt-auto flex items-center text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:gap-2 transition-all">
                      <Link to={`/post/${post.id}`} className="flex items-center">
                        {t.home.readArticle} <ArrowRight className="ml-1.5 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </div>
                  </div>
                  <Link to={`/post/${post.id}`} className="absolute inset-0 z-0" />
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-10 border-t border-stone-100 dark:border-stone-800 mt-16">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t.home.previous}
              </button>
              <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500">
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {pageIndicator(language, currentPage, totalPages)}
                </span>
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t.home.next} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!loading && listPosts.length === 0 && (
            <div className="py-24 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[2rem] bg-stone-50/50 dark:bg-stone-900/20">
              <p className="text-stone-500 dark:text-stone-400 text-lg">{error || t.home.empty}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
