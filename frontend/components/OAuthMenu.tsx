import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';

type OAuthMenuProps = {
  open: boolean;
  onClose: () => void;
};

export default function OAuthMenu({ open, onClose }: OAuthMenuProps) {
  const t = useI18n();
  const { login } = useAuth();

  const handleLogin = (provider: 'github' | 'gitee') => {
    login(provider);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-[90%] max-w-sm bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/60 dark:border-stone-800/60 shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {t.oauth.title}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {t.oauth.subtitle}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleLogin('github')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-sm hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {t.oauth.github}
              </button>

              <button
                onClick={() => handleLogin('gitee')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.33h4.984s-.67 3.66-4.656 7.16c-3.984 3.5-5.656 4.16-7.656 4.16-2 0-3.656-.67-3.656-.67V9.33s3 1.33 5.328 1.33c2.328 0 3.656-1.33 5.328-1.33h.328V5.33zM7.656 9.33v6s-2.328-.67-4.328-.67V9.33h4.328zm1.328 0h4.984v4.66s-2.328.67-4.328.67-4.328-.67-4.328-.67V9.33h3.672z" />
                </svg>
                {t.oauth.gitee}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
