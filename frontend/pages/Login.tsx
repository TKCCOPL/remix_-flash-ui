import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import CodeCreatures from '../components/CodeCreatures';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const navigate = useNavigate();
  const t = useI18n();
  const { user, isAdmin, login: oauthLogin, refreshUser } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    if (user) {
      navigate('/');
      return;
    }
    // Fallback: check admin session
    authApi.me()
      .then(() => navigate('/admin'))
      .catch(() => {});
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await authApi.login(username, password);
      if (!result.ok) {
        setError(t.login.error);
        return;
      }
      await refreshUser();
      navigate('/admin');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError(t.login.error);
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(t.login.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left brand panel (always dark) ── */}
      <div className="relative hidden lg:flex flex-col p-12 bg-stone-900 text-white overflow-hidden">
        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold mb-8">
          <span className="text-white font-bold">XiaoC'</span>
          <span className="text-indigo-400">blog</span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10 mb-8">
          <h2 className="text-2xl font-bold leading-tight mb-3">
            记录探索<br />分享见解
          </h2>
          <p className="text-stone-400 text-xs max-w-xs leading-relaxed">
            一个关于软件工程、界面设计和技术探索的个人博客
          </p>
        </div>

        {/* CodeCreatures animation — centered, main visual */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <CodeCreatures
            isTyping={focusedField !== null}
            showPassword={showPassword && focusedField === 'password'}
            submitting={submitting}
            passwordLength={password.length}
          />
        </div>

        {/* Footer links */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-stone-500 mt-auto pt-6">
          <span>&copy; {new Date().getFullYear()} XiaoC'blog</span>
          <a href="https://github.com/TKCCOPL" target="_blank" rel="noopener" className="hover:text-stone-300 transition-colors">
            GitHub
          </a>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:24px_24px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 size-48 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* ── Right form panel (follows theme) ── */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-stone-950">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-bold mb-10">
            <span className="text-stone-900 dark:text-stone-100">XiaoC'</span>
            <span className="text-indigo-600 dark:text-indigo-400">blog</span>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
              {t.login.title}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t.login.subtitle}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          {/* Admin form */}
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t.login.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className="w-full h-11 px-4 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/10 focus:border-stone-900 transition-all outline-none text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-11 px-4 pr-10 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/10 focus:border-stone-900 transition-all outline-none text-stone-900 dark:text-stone-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 focus:ring-4 focus:ring-stone-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? `${t.login.submit}...` : t.login.submit}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {t.login.divider}
            </span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3">
            <button
              onClick={() => oauthLogin('github')}
              className="w-full h-11 flex items-center justify-center gap-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t.oauth.github}
            </button>

            <button
              onClick={() => oauthLogin('gitee')}
              className="w-full h-11 flex items-center justify-center gap-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.984 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 01-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 00-.592-.593h-4.15a.592.592 0 01-.592-.592v-1.482a.593.593 0 01.593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 01-4 4H5.926a.593.593 0 01-.593-.593V9.778a4.444 4.444 0 014.445-4.444h8.296z" />
              </svg>
              {t.oauth.gitee}
            </button>
          </div>

          {/* Back to home */}
          <div className="text-center mt-8">
            <Link
              to="/"
              className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              {t.login.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
