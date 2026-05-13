import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Sun, Moon, Languages } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';

export default function Layout() {
  const location = useLocation();
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const t = useI18n();
  const showLanguageLabel = language === 'zh' ? t.actions.languageEn : t.actions.languageZh;
  const themeLabel = theme === 'dark' ? t.actions.themeLight : t.actions.themeDark;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group">
              {t.brand.name}
              <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                {t.brand.suffix}
              </span>
            </Link>
            <nav className="hidden md:flex space-x-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <Link 
                to="/" 
                className={`px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-200 ${location.pathname === '/' ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/70' : ''}`}
              >
                {t.nav.home}
              </Link>
              <Link 
                to="/profile" 
                className={`px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-200 ${location.pathname === '/profile' ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/70' : ''}`}
              >
                {t.nav.profile}
              </Link>
              <Link 
                to="/admin" 
                className={`px-3 py-1.5 rounded-lg hover:text-zinc-900 hover:bg-zinc-100/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-200 ${location.pathname.startsWith('/admin') ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/70' : ''}`}
              >
                {t.nav.admin}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/70 rounded-lg text-zinc-400 text-xs cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors">
              <Search className="w-3.5 h-3.5" />
              <span>{t.search.placeholder}</span>
              <kbd className="flex items-center gap-1 font-sans text-[10px] font-medium border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-950 text-zinc-300 dark:text-zinc-400 ml-2">
                <Command className="w-2.5 h-2.5" />
                K
              </kbd>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t.actions.switchLanguage}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 transition-colors"
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">{showLanguageLabel}</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t.actions.switchTheme}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs font-medium">{themeLabel}</span>
              </button>
            </div>

            <button
              aria-label={t.search.mobileAria}
              className="md:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} {t.brand.name} {t.footer.rights}
          </p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.twitter}</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">{t.footer.github}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
