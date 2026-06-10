import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

const isChunkLoadError = (error: Error): boolean =>
  error.name === 'ChunkLoadError' ||
  error.message.includes('Failed to fetch dynamically imported module') ||
  error.message.includes('Loading chunk') ||
  error.message.includes('Loading CSS chunk');

const isNetworkError = (error: Error): boolean =>
  error.message.includes('NetworkError') ||
  error.message.includes('network') ||
  navigator.onLine === false;

function getStoredLanguage(): 'zh' | 'en' {
  try {
    const stored = localStorage.getItem('ui_language');
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'zh';
}

const errorMessages = {
  zh: {
    title: '页面出错了',
    chunkTitle: '资源加载失败',
    networkTitle: '网络连接异常',
    chunkDesc: '应用更新后旧缓存未清除，导致部分资源加载失败。',
    networkDesc: '网络连接似乎中断了，请检查网络后重试。',
    defaultDesc: '渲染过程中发生了意外错误，请尝试刷新页面。',
    reload: '重新加载',
    details: '错误详情',
    hideDetails: '隐藏详情',
  },
  en: {
    title: 'Something went wrong',
    chunkTitle: 'Resource loading failed',
    networkTitle: 'Network error',
    chunkDesc: 'The app was updated and stale cache is preventing resources from loading.',
    networkDesc: 'Your network connection appears to be offline.',
    defaultDesc: 'An unexpected error occurred during rendering. Try reloading the page.',
    reload: 'Reload',
    details: 'Error details',
    hideDetails: 'Hide details',
  },
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      console.error('[ErrorBoundary] Chunk load error:', error.message);
    } else {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReload = () => {
    if (isChunkLoadError(this.state.error!)) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const lang = getStoredLanguage();
    const t = errorMessages[lang];
    const { error } = this.state;

    const isChunk = error ? isChunkLoadError(error) : false;
    const isNet = error ? isNetworkError(error) : false;
    const title = isChunk ? t.chunkTitle : isNet ? t.networkTitle : t.title;
    const desc = isChunk ? t.chunkDesc : isNet ? t.networkDesc : t.defaultDesc;

    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-stone-300 dark:text-stone-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-3">
            {title}
          </h1>

          <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
            {desc}
          </p>

          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {t.reload}
          </button>

          {error && (
            <details className="mt-8 text-left">
              <summary className="text-sm text-stone-400 dark:text-stone-500 cursor-pointer hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                {t.details}
              </summary>
              <pre className="mt-3 p-4 rounded-xl bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
