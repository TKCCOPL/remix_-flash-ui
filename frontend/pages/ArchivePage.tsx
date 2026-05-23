import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { postsApi } from '../api/posts';
import type { ArchiveData } from '../api/posts';
import YearSection from '../components/archive/YearSection';
import { useI18n } from '../context/Preferences';

export default function ArchivePage() {
  const t = useI18n();
  const [archiveData, setArchiveData] = useState<ArchiveData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchArchive = async () => {
      try {
        const data = await postsApi.getArchive();
        if (!cancelled) {
          setArchiveData(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load archive data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-stone-200 dark:bg-stone-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
      <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-8">{t.archive.title}</h1>
      {years.length === 0 ? (
        <p className="text-stone-400">{t.archive.empty}</p>
      ) : (
        <div className="max-w-3xl mx-auto">
          {years.map((year, index) => (
            <motion.div
              key={year}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <YearSection year={Number(year)} months={archiveData[year]} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
