import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 64;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await authApi.me();
        if (!cancelled) setAuthenticated(true);
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  if (authenticated === null) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-stone-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const sidebarItems = [
    { icon: LayoutDashboard, path: '/admin', label: t.admin.sidebar.overview },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className={`p-4 border-b border-stone-200/60 dark:border-stone-800/60 ${collapsed ? 'px-3' : ''}`}>
        {!collapsed && (
          <Link to="/" className="text-lg font-bold text-stone-900 dark:text-stone-100 block truncate">
            {t.brand.name}<span className="text-indigo-500">{t.brand.suffix}</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex mt-3 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors w-full justify-center"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-stone-200/60 dark:border-stone-800/60">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? t.admin.logout : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.admin.logout}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex">
      {/* Desktop sidebar — floating card */}
      <aside
        className="hidden md:block shrink-0 sticky top-6 h-[calc(100vh-3rem)] ml-6 self-start bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-3xl transition-all duration-300 overflow-hidden shadow-sm"
        style={{ width: sidebarWidth }}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-stone-900 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation sidebar"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center px-4 py-3 border-b border-stone-200/60 dark:border-stone-800/60">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg"
            aria-label="Open sidebar"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 md:p-8 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
