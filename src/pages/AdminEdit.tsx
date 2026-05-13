import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { postsApi } from '../api/posts';

export default function AdminEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useI18n();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await authApi.me();
        if (id) {
          const post = await postsApi.get(id);
          if (!cancelled) {
            setTitle(post.title);
            setCategory(post.category ?? '');
            setImageUrl(post.image_url ?? '');
            setContent(post.content);
          }
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        if (requestError instanceof ApiError && requestError.status === 401) {
          navigate('/login');
          return;
        }
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError(t.login.error);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, t.login.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const normalizedImageUrl = imageUrl.trim();

    try {
      if (id) {
        await postsApi.update(id, { title, category, content, image_url: normalizedImageUrl });
      } else {
        await postsApi.create({ title, category, content, image_url: normalizedImageUrl || undefined });
      }
      navigate('/admin');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        navigate('/login');
        return;
      }
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(t.login.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <header className="mb-10">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.editor.back}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {id ? t.editor.editTitle : t.editor.newTitle}
        </h1>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.editor.fieldTitle}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.editor.placeholderTitle}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none text-zinc-900 dark:text-zinc-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.editor.fieldCategory}</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t.editor.placeholderCategory}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.editor.fieldImage}</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t.editor.placeholderImage}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                {t.editor.clearImage}
              </button>
            </div>
          </div>

          {imageUrl.trim() && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.editor.imagePreview}</label>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                <img src={imageUrl.trim()} alt={title || t.editor.imagePreview} className="w-full max-h-72 object-cover" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.editor.content}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              placeholder={t.editor.placeholderContent}
              className="w-full px-4 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/10 focus:border-zinc-900 transition-all outline-none min-h-[400px] text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
          <Link
            to="/admin"
            className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {t.editor.cancel}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" /> {saving ? `${t.editor.save}...` : t.editor.save}
          </button>
        </div>
      </form>
    </div>
  );
}
