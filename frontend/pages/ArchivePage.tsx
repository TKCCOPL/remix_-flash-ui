import { useEffect, useState } from 'react';
import { postsApi } from '../api/posts';
import type { ArchiveData } from '../api/posts';
import { getCached, setCache } from '../api/cache';
import YearSection from '../components/archive/YearSection';
import { useI18n } from '../context/Preferences';

export default function ArchivePage() {
  const t = useI18n();
  const [archiveData, setArchiveData] = useState<ArchiveData>(
    () => getCached<ArchiveData>('archive_data') || {}
  );
  const [loading, setLoading] = useState(() => !getCached('archive_data'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchArchive = async () => {
      try {
        const data = await postsApi.getArchive();
        if (!cancelled) {
          setArchiveData(data);
          setCache('archive_data', data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load archive data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchArchive();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  const years = Object.keys(archiveData).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="w-full">
      {/* 标题：始终显示，不受 loading 影响 */}
      <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-8">
        {t.archive.title}
      </h1>

      {loading ? (
        /* 骨架屏：模拟年份+月份条目结构 */
        <div className="max-w-3xl mx-auto animate-pulse space-y-8">
          {[1, 2].map((y) => (
            <div key={y}>
              <div className="h-7 bg-stone-200 dark:bg-stone-700 rounded w-20 mb-4" />
              <div className="space-y-3 pl-4 border-l-2 border-stone-200 dark:border-stone-700">
                {[1, 2, 3].map((m) => (
                  <div key={m} className="h-5 bg-stone-200 dark:bg-stone-700 rounded w-2/3" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : years.length === 0 ? (
        <p className="text-stone-400">{t.archive.empty}</p>
      ) : (
        <div className="max-w-3xl mx-auto">
          {years.map((year, index) => (
            <div
              key={year}
              className="stagger-item"
              style={{ '--stagger-index': index } as React.CSSProperties}
            >
              <YearSection year={Number(year)} months={archiveData[year]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
