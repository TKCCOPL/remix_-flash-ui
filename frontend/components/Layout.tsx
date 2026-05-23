import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Sun, Moon, Languages, Menu, X } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';

interface SearchResult {
  id: number;
  title: string;
  summary: string;
  category: string | null;
}

export default function Layout() {
  const location = useLocation();
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const t = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const showLanguageLabel = language === 'zh' ? t.actions.languageEn : t.actions.languageZh;
  const themeLabel = theme === 'dark' ? t.actions.themeLight : t.actions.themeDark;

  // 搜索函数
  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/posts/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results.slice(0, 5));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setMobileNavOpen(false)}
      className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium ${
        isActive(to)
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-b-2 border-indigo-600 dark:border-indigo-400'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/50 dark:hover:bg-stone-900/60 border-b-2 border-transparent'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-stone-950/70 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t.brand.name}<span className="text-indigo-500">{t.brand.suffix}</span>
            </Link>
            <nav className="hidden md:flex space-x-1">
              {navLink('/', t.nav.home)}
              {navLink('/archive', t.nav.archive)}
              {navLink('/categories', t.nav.categories)}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div ref={searchRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800/70 rounded-lg text-stone-400 text-xs cursor-text hover:bg-stone-100 dark:hover:bg-stone-900/80 transition-colors">
                <Search className="w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder={t.search.placeholder}
                  className="bg-transparent border-none outline-none w-32 lg:w-48 text-stone-700 dark:text-stone-300 placeholder-stone-400 text-xs"
                />
                {isSearching && (
                  <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <kbd className="flex items-center gap-1 font-sans text-[10px] font-medium border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded bg-white dark:bg-stone-950 text-stone-300 dark:text-stone-400 ml-2">
                  <Command className="w-2.5 h-2.5" />
                  K
                </kbd>
              </div>

              {/* 搜索结果下拉 */}
              <AnimatePresence>
                {showSearchResults && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                  >
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                      搜索中...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {searchResults.map((post) => (
                        <Link
                          key={post.id}
                          to={`/post/${post.id}`}
                          className="block px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchQuery('');
                          }}
                        >
                          <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm">{post.title}</h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                            {post.summary}
                          </p>
                        </Link>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                      未找到相关文章
                    </div>
                  )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t.actions.switchLanguage}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 transition-colors"
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">{showLanguageLabel}</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t.actions.switchTheme}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs font-medium">{themeLabel}</span>
              </button>
            </div>

            <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <img src="/avatar.png" alt="Profile" className="w-full h-full object-cover" />
            </Link>

            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 rounded-lg transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-stone-200/60 dark:border-stone-800/60"
            >
              <nav className="px-6 py-3 space-y-1 bg-stone-50 dark:bg-stone-950">
                {navLink('/', t.nav.home)}
                {navLink('/archive', t.nav.archive)}
                {navLink('/categories', t.nav.categories)}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-100/30 dark:bg-stone-950/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-stone-500 dark:text-stone-400">
          <p>
            © {new Date().getFullYear()} {t.brand.name}{t.brand.suffix} {t.footer.rights}
          </p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t.footer.twitter}</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t.footer.github}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
