import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Settings, X, UploadCloud, Loader2, Code2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useI18n, usePreferences } from '../context/Preferences';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { postsApi, type ApiPost } from '../api/posts';
import { uploadApi } from '../api/upload';
import { categoriesApi, type Category } from '../api/categories';
import { locales, dateFormats } from '../i18n';
import TiptapEditor from '../components/editor/TiptapEditor';
import SourceMode from '../components/editor/SourceMode';

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
  const [sourceMode, setSourceMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [postStatus, setPostStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [isUploading, setIsUploading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
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
        
        // 预加载分类列表
        categoriesApi.list().then(res => {
          if (!cancelled) setAvailableCategories(res);
        }).catch(() => {});

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
          category: category || "",
          content,
          image_url: normalizedImageUrl || "",
          status: targetStatus,
        });
      } else {
        await postsApi.create({ title, category: category || "", content, image_url: normalizedImageUrl || "", status: targetStatus });
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

  const handleArchive = async () => {
    if (!id) return;
    try {
      await postsApi.updateStatus(id, 'archived');
      setPostStatus('archived');
      setError('');
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
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] relative">
      <header className="mb-6 flex items-center justify-between shrink-0">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.editor.back}
        </Link>
        <div className="text-sm font-medium text-stone-400 uppercase tracking-widest">
          {sourceMode ? t.editor.sourceMode : t.editor.richMode}
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Main Content Area */}
        <AnimatePresence mode="wait">
        {sourceMode ? (
          <motion.div
            key="source"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.editor.placeholderTitle}
              className="w-full bg-transparent border-none outline-none text-4xl md:text-5xl font-black leading-tight text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors py-4 shrink-0"
              required
            />
            <SourceMode
              content={content}
              onChange={setContent}
              placeholder={t.editor.placeholderContent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.editor.placeholderTitle}
              className="w-full bg-transparent border-none outline-none text-4xl md:text-5xl font-black leading-tight text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors py-4 shrink-0"
              required
            />
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder={t.editor.placeholderContent}
            />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Settings Sidebar */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.aside
              ref={settingsSidebarRef}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-6 right-6 bottom-[100px] z-[70] w-full max-w-[320px] bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl shadow-2xl flex flex-col border border-stone-200/50 dark:border-stone-800/50 rounded-3xl overflow-hidden"
            >
                <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800">
                  <h2 className="font-semibold text-lg text-stone-900 dark:text-stone-100">{t.admin.postSettings}</h2>
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {t.editor.fieldCategory}
                      </label>
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Quick Select</span>
                    </div>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder={t.editor.placeholderCategory}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800/50 outline-none text-stone-900 dark:text-stone-100 font-medium placeholder:text-stone-400 transition-all rounded-xl px-4 py-3 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    />
                    
                    {availableCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableCategories.map(cat => {
                          const isSelected = category.trim().toLowerCase() === cat.name.toLowerCase();
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategory(cat.name)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                                isSelected
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800/50'
                                  : 'bg-stone-100/80 text-stone-600 border-transparent hover:bg-stone-200 dark:bg-stone-800/80 dark:text-stone-400 dark:hover:bg-stone-700'
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {t.editor.fieldImage}
                    </label>
                    <div className="flex gap-2">
                      <label className="relative flex-1 flex items-center justify-center px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200/50 dark:border-stone-800/50 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-900 cursor-pointer transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploading(true);
                            try {
                              const res = await uploadApi.uploadImage(file);
                              setImageUrl(res.url);
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                        />
                        {isUploading ? (
                          <span className="flex items-center text-indigo-600 font-medium">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.admin.uploading}
                          </span>
                        ) : (
                          <span className="flex items-center text-stone-600 dark:text-stone-300 font-medium text-sm">
                            <UploadCloud className="w-4 h-4 mr-2" />
                            {imageUrl ? t.admin.replaceImage : t.admin.uploadLocal}
                          </span>
                        )}
                      </label>
                      {imageUrl.trim() && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-3 py-2 text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors whitespace-nowrap border border-red-100 dark:border-red-900/50"
                        >
                          {t.editor.clearImage}
                        </button>
                      )}
                    </div>
                  </div>

                  {imageUrl.trim() && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {t.editor.imagePreview}
                      </label>
                      <div className="rounded-2xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden bg-stone-50 dark:bg-stone-950 relative group">
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

        {/* Absolute Action Bar */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.1 }}
          className="absolute bottom-6 md:bottom-8 z-50 flex items-center justify-between gap-4 md:gap-6 px-4 md:px-6 py-3 md:py-3 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-2xl md:rounded-full shadow-2xl w-full"
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
                  onClick={() => setSourceMode(prev => !prev)}
                  className={`p-2.5 rounded-xl transition-all ${
                    sourceMode
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow-inner'
                      : 'bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  title={sourceMode ? t.editor.richMode : t.editor.sourceMode}
                >
                  <Code2 className="w-4 h-4" />
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
                  title={t.admin.postSettings}
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
              {id && postStatus === 'published' && (
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  className="inline-flex items-center justify-center whitespace-nowrap shrink-0 px-5 py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-[0.98] text-sm"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {t.admin.archive}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleAction('draft')}
                disabled={saving}
                className="inline-flex items-center justify-center whitespace-nowrap shrink-0 px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm"
              >
                {t.admin.saveDraft}
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
                  : (postStatus === 'draft' ? t.admin.publish : (id ? t.editor.save : t.admin.publish))
                }
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
