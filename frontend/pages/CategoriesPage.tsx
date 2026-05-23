import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { categoriesApi } from '../api/categories';
import type { Category } from '../api/categories';
import TagCloud from '../components/categories/TagCloud';
import { useI18n } from '../context/Preferences';

export default function CategoriesPage() {
  const t = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.list();
        if (!cancelled) {
          setCategories(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mb-6"></div>
          <div className="flex flex-wrap gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 bg-stone-200 dark:bg-stone-700 rounded-full"></div>
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

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-8">{t.categories.title}</h1>
      <p className="text-stone-600 dark:text-stone-400 mb-8">
        {t.categories.description.replace('{count}', String(categories.length))}
      </p>
      <TagCloud categories={categories} />
    </motion.div>
  );
}
