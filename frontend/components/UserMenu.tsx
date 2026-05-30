import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const t = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors ml-1"
      >
        <img
          src={user.avatar_url || '/avatar.png'}
          alt={user.username}
          className="w-full h-full object-cover"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-[calc(100%+0.5rem)] right-0 w-48 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-xl z-50 overflow-hidden py-1"
          >
            <div className="px-4 py-3 border-b border-stone-200/60 dark:border-stone-800/60">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {user.username}
              </p>
            </div>

            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors"
            >
              <User className="w-4 h-4" />
              {t.nav.profile}
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-red-50/80 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.userMenu.logout}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
