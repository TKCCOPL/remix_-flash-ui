import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Sun, Moon, Languages, Menu, X } from 'lucide-react';
import { useI18n, usePreferences } from '../context/Preferences';

export default function Layout() {
  const location = useLocation();
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const t = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showLanguageLabel = language === 'zh' ? t.actions.languageEn : t.actions.languageZh;
  const themeLabel = theme === 'dark' ? t.actions.themeLight : t.actions.themeDark;

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
              {navLink('/profile', t.nav.profile)}
              {navLink('/admin', t.nav.admin)}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800/70 rounded-lg text-stone-400 text-xs cursor-text hover:bg-stone-100 dark:hover:bg-stone-900/80 transition-colors">
              <Search className="w-3.5 h-3.5" />
              <span>{t.search.placeholder}</span>
              <kbd className="flex items-center gap-1 font-sans text-[10px] font-medium border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded bg-white dark:bg-stone-950 text-stone-300 dark:text-stone-400 ml-2">
                <Command className="w-2.5 h-2.5" />
                K
              </kbd>
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
                {navLink('/profile', t.nav.profile)}
                {navLink('/admin', t.nav.admin)}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
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
