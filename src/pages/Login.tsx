import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const t = useI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await authApi.login(username, password);
      if (!result.ok) {
        setError(t.login.error);
        return;
      }
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
    <div className="flex-1 flex flex-col items-center justify-center -mt-20">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-8">{t.login.title}</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t.login.username}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t.login.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 bg-zinc-900 text-white font-medium py-3 rounded-xl hover:bg-zinc-800 focus:ring-4 focus:ring-zinc-900/20 transition-all"
          >
            {submitting ? `${t.login.submit}...` : t.login.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
