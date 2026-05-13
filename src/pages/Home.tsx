import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, type Locale } from 'date-fns';
import { ChevronRight, ArrowRight, Sparkles, Tag, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n, usePreferences } from '../context/Preferences';
import { dateFormats, locales, pageIndicator } from '../i18n';
import { ApiPost, postsApi } from '../api/posts';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function normalizeDate(value: string): string {
  if (value.includes('T')) {
    return value;
  }
  return value.replace(' ', 'T');
}

function formatPostDate(value: string, pattern: string, locale: Locale): string {
  const date = new Date(normalizeDate(value));
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, pattern, { locale });
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { language } = usePreferences();
  const t = useI18n();
  const locale = locales[language];
  const formats = dateFormats[language];
  const postsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const response = await postsApi.list(0, 500);
        if (!cancelled) {
          setPosts(response);
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
  }, [t.home.empty]);

  const featuredPost = posts[0];
  const featuredImageUrl = featuredPost?.image_url?.trim() || '';
  const allListPosts = useMemo(() => posts.slice(1), [posts]);
  const totalPages = Math.ceil(allListPosts.length / postsPerPage);
  const listPosts = allListPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  const categories = Array.from(new Set(posts.map((post) => post.category || t.post.general))).slice(0, 5);

  return (
    <div className="w-full space-y-24">
      <section className="relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-900/70 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{t.home.heroBadge}</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 leading-[1.1]">
            {t.home.heroTitle}
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t.home.heroSubtitle}
          </p>
        </motion.div>
      </section>

      {featuredPost && (
        <section>
          <div className="flex items-center gap-2 mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.home.featured}</h2>
            <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <motion.div
            whileHover={{ y: -4 }}
            className={`group relative ${featuredImageUrl ? 'grid md:grid-cols-2' : ''} gap-8 bg-zinc-50/50 dark:bg-zinc-900/60 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300`}
          >
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium rounded-full">
                  {featuredPost.category || t.post.general}
                </span>
                <span className="text-zinc-400 text-xs">
                  {formatPostDate(featuredPost.created_at, formats.medium, locale)}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                <Link to={`/post/${featuredPost.id}`}>
                  {featuredPost.title}
                </Link>
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300 line-clamp-3 mb-6 leading-relaxed text-lg">
                {featuredPost.content.replace(/[#*`>]/g, '')}
              </p>
              <Link
                to={`/post/${featuredPost.id}`}
                className="inline-flex items-center font-semibold text-zinc-900 dark:text-zinc-100 hover:gap-2 transition-all"
              >
                {t.home.readFull} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
            {featuredImageUrl && (
              <div className="hidden md:block rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/60 aspect-video overflow-hidden">
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

      <section className="grid lg:grid-cols-4 gap-16">
        <div className="lg:col-span-1 space-y-10">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-6 flex items-center gap-2">
              <Tag className="w-4 h-4" /> {t.home.categories}
            </h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {[t.home.all, ...categories].map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all text-left"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-10">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.home.latest}</h2>
            <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-16"
          >
            {listPosts.map((post) => (
              <motion.article
                key={post.id}
                variants={item}
                className="group relative flex flex-col items-start"
              >
                <div className="flex items-center gap-3 text-xs mb-3">
                  <time dateTime={post.created_at} className="text-zinc-400">
                    {formatPostDate(post.created_at, formats.long, locale)}
                  </time>
                  <span className="text-zinc-200">/</span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-[10px]">
                    {post.category || t.post.general}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors">
                  <Link to={`/post/${post.id}`}>
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-4 line-clamp-2 text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
                  {post.content.replace(/[#*`>]/g, '')}
                </p>
                <div className="mt-6 flex items-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:gap-1 transition-all">
                  <Link to={`/post/${post.id}`} className="flex items-center">
                    {t.home.readArticle} <ChevronRight className="ml-0.5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                </div>
              </motion.article>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-10 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> {t.home.previous}
                </button>
                <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {pageIndicator(language, currentPage, totalPages)}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {t.home.next} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!loading && listPosts.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                <p className="text-zinc-400">{error || t.home.empty}</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
