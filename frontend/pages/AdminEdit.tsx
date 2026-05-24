import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, PenLine, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { useI18n, usePreferences } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { postsApi, type ApiPost } from '../api/posts';
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [postStatus, setPostStatus] = useState<'published' | 'draft'>('published');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  const settingsSidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsSidebarRef.current && !settingsSidebarRef.current.contains(e.target as Node)) {
        const target = e.target as Element;
        if (!target.closest('[data-settings-toggle="true"]')) {
          setIsSettingsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  useEffect(() => {
    if (error) setError('');
  }, [title, content]);

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
            setPostStatus(post.status ?? 'published');
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

  const handleAction = async (targetStatus: 'published' | 'draft') => {
    if (!title || !content) {
      setError(t.editor.emptyFields);
      return;
    }
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
          status: targetStatus,
        });
      } else {
        await postsApi.create({ title, category, content, image_url: normalizedImageUrl || undefined, status: targetStatus });
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
  const locale = locales[language];
  const dateFormat = dateFormats[language].medium;

  const formatDate = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return format(date, dateFormat, { locale });
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-6rem)]">
      <header className="mb-6 flex items-center justify-between shrink-0">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.editor.back}
        </Link>
        <div className="text-sm font-medium text-stone-400 uppercase tracking-widest">
          {viewMode === 'edit' ? t.editor.edit : t.editor.preview}
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        {viewMode === 'edit' ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.editor.placeholderTitle}
              className="w-full bg-transparent border-none outline-none text-4xl md:text-5xl font-black leading-tight text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors py-4"
              required
            />
            
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={1}
              placeholder={t.editor.placeholderContent}
              className="w-full bg-transparent border-none outline-none text-xl leading-loose text-stone-800 dark:text-stone-200 resize-none overflow-hidden placeholder:text-stone-300 dark:placeholder:text-stone-700 min-h-[300px] flex-1 transition-colors font-serif"
              required
            />
          </motion.div>
        ) : (
          <div className="prose prose-lg dark:prose-invert max-w-none flex-1">
            {title && <h1 className="text-4xl md:text-5xl font-black mb-8 leading-tight">{title}</h1>}
            {content ? (
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            ) : (
              <p className="text-stone-400 dark:text-stone-600 italic">
                {t.editor.placeholderContent}
              </p>
            )}
          </div>
        )}

        {/* Settings Sidebar */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.aside
              ref={settingsSidebarRef as any}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-6 right-6 bottom-[100px] z-[70] w-full max-w-[320px] bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl shadow-2xl flex flex-col border border-stone-200/50 dark:border-stone-800/50 rounded-3xl overflow-hidden"
            >
                <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800">
                  <h2 className="font-semibold text-lg text-stone-900 dark:text-stone-100">文章设置</h2>
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {t.editor.fieldCategory}
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder={t.editor.placeholderCategory}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800/50 outline-none text-stone-900 dark:text-stone-100 font-medium placeholder:text-stone-400 transition-all rounded-xl px-4 py-3 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {t.editor.fieldImage}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder={t.editor.placeholderImage}
                        className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800/50 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all rounded-xl px-4 py-3 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-2 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors whitespace-nowrap"
                      >
                        {t.editor.clearImage}
                      </button>
                    </div>
                  </div>

                  {imageUrl.trim() && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {t.editor.imagePreview}
                      </label>
                      <div className="rounded-2xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden bg-stone-50 dark:bg-stone-950">
                        <img
                          src={imageUrl.trim()}
                          alt={title || t.editor.imagePreview}
                          className="w-full max-h-48 object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
          )}
        </AnimatePresence>

        {/* Sticky Action Bar */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.1 }}
          className="sticky bottom-6 md:bottom-8 mt-12 z-50 flex items-center justify-between gap-4 md:gap-6 px-4 md:px-6 py-3 md:py-3 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-2xl md:rounded-full shadow-2xl w-full"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500 justify-center lg:justify-start">
              <span className="flex items-center gap-1">
                {t.editor.wordCount} <span className="text-stone-700 dark:text-stone-300 ml-0.5">{wordCount}</span>
              </span>
              {id && createdAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
                  <span>
                    {t.editor.created} {formatDate(createdAt)}
                  </span>
                </>
              )}
              {id && updatedAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
                  <span>
                    {t.editor.updated} {formatDate(updatedAt)}
                  </span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center lg:justify-end gap-2 md:gap-3 shrink-0">
              <div className="flex items-center gap-1.5 mr-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode(prev => prev === 'edit' ? 'preview' : 'edit')}
                  className={`p-2.5 rounded-xl transition-all ${
                    viewMode === 'preview' 
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow-inner' 
                      : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  title={viewMode === 'edit' ? '切换到预览' : '继续编辑'}
                >
                  {viewMode === 'preview' ? <PenLine className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  data-settings-toggle="true"
                  className={`p-2.5 rounded-xl transition-all ${
                    isSettingsOpen
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow-inner'
                      : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  title="文章设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center justify-center whitespace-nowrap shrink-0 px-5 py-2.5 bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-sm"
              >
                {t.editor.cancel}
              </Link>
              <button
                type="button"
                onClick={() => void handleAction('draft')}
                disabled={saving}
                className="inline-flex items-center justify-center whitespace-nowrap shrink-0 px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm"
              >
                存草稿
              </button>
              <button
                type="button"
                onClick={() => void handleAction('published')}
                disabled={saving}
                className="inline-flex items-center justify-center whitespace-nowrap shrink-0 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                <Save className="w-4 h-4 mr-2" /> 
                {saving 
                  ? `${t.editor.save}...` 
                  : (postStatus === 'draft' ? '发布' : (id ? '更新' : '发布'))
                }
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
