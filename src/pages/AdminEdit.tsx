import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, PenLine } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { useI18n } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { postsApi, type ApiPost } from '../api/posts';
import { usePreferences } from '../context/Preferences';
import { locales, dateFormats } from '../i18n';

function getWordCount(text: string): number {
  const chinese = text.match(/[一-鿿]/g)?.length ?? 0;
  const english = text.replace(/[一-鿿]/g, '').trim().split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

export default function AdminEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useI18n();
  const { language } = usePreferences();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await authApi.me();
        if (id) {
          const post: ApiPost = await postsApi.get(id);
          if (!cancelled) {
            setTitle(post.title);
            setCategory(post.category ?? '');
            setImageUrl(post.image_url ?? '');
            setContent(post.content);
            setCreatedAt(post.created_at);
            setUpdatedAt(post.updated_at);
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
        await postsApi.update(id, {
          title,
          category: category || undefined,
          content,
          image_url: normalizedImageUrl || undefined,
        });
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

  const wordCount = getWordCount(content);
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));
  const locale = locales[language];
  const dateFormat = dateFormats[language].medium;

  const formatDate = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return format(date, dateFormat, { locale });
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <header className="mb-6">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.editor.back}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {id ? t.editor.editTitle : t.editor.newTitle}
        </h1>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      {/* Mobile tab switcher */}
      <div className="md:hidden flex gap-1 mb-4 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mobileTab === 'edit'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <PenLine className="w-4 h-4" />
          {t.editor.edit}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mobileTab === 'preview'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          {t.editor.preview}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Split pane layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">
          {/* Left pane: Editor */}
          <div className={`space-y-5 ${mobileTab === 'preview' ? 'hidden md:block' : ''}`}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t.editor.fieldTitle}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.editor.placeholderTitle}
                className="w-full px-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t.editor.fieldCategory}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t.editor.placeholderCategory}
                className="w-full px-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t.editor.fieldImage}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t.editor.placeholderImage}
                  className="w-full px-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-stone-900 dark:text-stone-100"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-4 py-3 bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  {t.editor.clearImage}
                </button>
              </div>
            </div>

            {imageUrl.trim() && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {t.editor.imagePreview}
                </label>
                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-stone-50 dark:bg-stone-900">
                  <img
                    src={imageUrl.trim()}
                    alt={title || t.editor.imagePreview}
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t.editor.content}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                placeholder={t.editor.placeholderContent}
                className="w-full px-4 py-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[500px] text-stone-900 dark:text-stone-100"
                required
              />
            </div>
          </div>

          {/* Right pane: Preview */}
          <div className={`${mobileTab === 'edit' ? 'hidden md:block' : ''}`}>
            <div className="md:sticky md:top-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                <span className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  {t.editor.preview}
                </span>
              </div>
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-950 p-6 min-h-[500px] max-h-[calc(100vh-12rem)] overflow-y-auto">
                {content ? (
                  <div className="prose">
                    <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                  </div>
                ) : (
                  <p className="text-stone-400 dark:text-stone-600 italic">
                    {t.editor.placeholderContent}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
              <span>
                {t.editor.wordCount}: <span className="font-medium text-stone-700 dark:text-stone-300">{wordCount}</span>
              </span>
              <span className="hidden sm:inline text-stone-300 dark:text-stone-700">|</span>
              <span>
                {t.editor.readingTime.replace('{min}', String(readingTime))}
              </span>
              {id && createdAt && (
                <>
                  <span className="hidden sm:inline text-stone-300 dark:text-stone-700">|</span>
                  <span>
                    {t.editor.created}: {formatDate(createdAt)}
                  </span>
                </>
              )}
              {id && updatedAt && (
                <>
                  <span className="hidden sm:inline text-stone-300 dark:text-stone-700">|</span>
                  <span>
                    {t.editor.updated}: {formatDate(updatedAt)}
                  </span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="px-5 py-2.5 bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-sm"
              >
                {t.editor.cancel}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                <Save className="w-4 h-4 mr-2" /> {saving ? `${t.editor.save}...` : t.editor.save}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
