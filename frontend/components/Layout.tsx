import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Sun, Moon, Languages, Menu, X, Code2, Coffee, Sparkles, TerminalSquare, PenTool, Feather, LogIn } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { postsApi, type SearchResult } from '../api/posts';
import OAuthMenu from './OAuthMenu';
import UserMenu from './UserMenu';

export default function Layout() {
  const location = useLocation();
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const t = useI18n();
  const { user, isAdmin } = useAuth();
  const [showOAuthMenu, setShowOAuthMenu] = useState(false);
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
      const data = await postsApi.search(query);
      setSearchResults(data.results.slice(0, 5));
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

  const navLink = (to: string, label: string) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileNavOpen(false)}
        className={`relative px-4 py-1.5 transition-colors duration-300 text-sm font-medium ${
          active
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
        }`}
      >
        {active && (
          <motion.div
            layoutId="desktop-nav-indicator"
            className="absolute inset-0 bg-stone-100 dark:bg-stone-800/80 rounded-md z-0"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* ── Ambient Background ── */}
      <div className="bg-mesh-container">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
        
        {/* Scattered Icons (Option C) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-25">
          <Code2 className="absolute top-[15%] left-[8%] w-10 h-10 text-stone-400 rotate-12" />
          <Coffee className="absolute top-[25%] right-[12%] w-12 h-12 text-stone-400 -rotate-12" />
          <Sparkles className="absolute top-[45%] left-[18%] w-8 h-8 text-stone-400 rotate-45" />
          <TerminalSquare className="absolute bottom-[35%] right-[20%] w-14 h-14 text-stone-400 -rotate-6" />
          <PenTool className="absolute bottom-[18%] left-[25%] w-10 h-10 text-stone-400 rotate-12" />
          <Feather className="absolute top-[65%] right-[8%] w-12 h-12 text-stone-400 -rotate-45" />
        </div>
      </div>

      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-full bg-white/70 dark:bg-stone-950/70 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
        <div className="px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 pl-2">
              {t.brand.name}<span className="text-indigo-500">{t.brand.suffix}</span>
            </Link>
            <nav className="hidden md:flex space-x-1">
              {navLink('/', t.nav.home)}
              {navLink('/about', t.nav.about)}
              {navLink('/archive', t.nav.archive)}
              {navLink('/categories', t.nav.categories)}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div ref={searchRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-900/50 border border-stone-200/50 dark:border-stone-800/60 rounded-full text-stone-400 text-xs cursor-text hover:bg-stone-100 dark:hover:bg-stone-900/80 transition-colors">
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
                  className="bg-transparent border-none outline-none w-32 lg:w-40 text-stone-700 dark:text-stone-300 placeholder-stone-400 text-xs"
                />
                {isSearching && (
                  <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <kbd className="flex items-center gap-1 font-sans text-[10px] font-medium border border-stone-200/80 dark:border-stone-700 px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-stone-950 text-stone-400 ml-1">
                  <Command className="w-2.5 h-2.5" />
                  K
                </kbd>
              </div>

              {/* 搜索结果下拉 */}
              <AnimatePresence>
                {showSearchResults && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-[calc(100%+0.75rem)] left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200 dark:border-stone-700 rounded-3xl shadow-xl z-50 max-h-96 overflow-y-auto"
                  >
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                      搜索中...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-2">
                      {searchResults.map((post) => (
                        <Link
                          key={post.id}
                          to={`/post/${post.id}`}
                          className="block px-4 py-3 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 rounded-2xl transition-colors"
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
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                      未找到相关文章
                    </div>
                  )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 bg-stone-100/50 dark:bg-stone-900/40 p-1 rounded-full border border-stone-200/50 dark:border-stone-800/50">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t.actions.switchLanguage}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm transition-all"
              >
                <Languages className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t.actions.switchTheme}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm transition-all"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {user || isAdmin ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowOAuthMenu(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 hover:shadow-sm transition-all ml-1 hidden sm:flex"
                aria-label="Login"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900/70 rounded-full transition-colors ml-1"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 移动端菜单下拉框 */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white/95 dark:bg-stone-950/95 backdrop-blur-2xl border border-stone-200/60 dark:border-stone-800/60 rounded-[2rem] p-4 shadow-2xl dark:shadow-black/50 md:hidden flex flex-col gap-2 origin-top"
            >
              {navLink('/', t.nav.home)}
              {navLink('/about', t.nav.about)}
              {navLink('/archive', t.nav.archive)}
              {navLink('/categories', t.nav.categories)}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12 pt-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-100/30 dark:bg-stone-950/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-stone-500 dark:text-stone-400">
          <p>
            © {new Date().getFullYear()} {t.brand.name}{t.brand.suffix} {t.footer.rights}
          </p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="https://github.com/TKCCOPL/remix_-flash-ui" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t.footer.github}</a>
          </div>
        </div>
      </footer>

      <OAuthMenu open={showOAuthMenu} onClose={() => setShowOAuthMenu(false)} />
    </div>
  );
}
