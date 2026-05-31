import { useEffect, useState } from 'react';
import { categoriesApi } from '../api/categories';
import type { Category } from '../api/categories';
import { getCached, setCache } from '../api/cache';
import TagCloud from '../components/categories/TagCloud';
import SEO from '../components/SEO';
import { useI18n } from '../context/Preferences';

export default function CategoriesPage() {
  const t = useI18n();
  const [categories, setCategories] = useState<Category[]>(
    () => getCached<Category[]>('categories_list') || []
  );
  const [loading, setLoading] = useState(() => !getCached('categories_list'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.list();
        if (!cancelled) {
          setCategories(data);
          setCache('categories_list', data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchCategories();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SEO
        title="分类"
        description="文章分类列表"
        type="website"
      />
      {/* 标题和描述：始终显示，不受 loading 影响 */}
      <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-8">
        {t.categories.title}
      </h1>
      <p className="text-stone-600 dark:text-stone-400 mb-8">
        {t.categories.description.replace('{count}', loading ? '…' : String(categories.length))}
      </p>

      {loading ? (
        /* 骨架屏：模拟 tag cloud 结构 */
        <div className="flex flex-wrap gap-3 justify-center items-center py-8 animate-pulse">
          {[80, 120, 60, 100, 90, 70, 110, 85, 65, 95].map((w, i) => (
            <div
              key={i}
              className="h-8 bg-stone-200 dark:bg-stone-700 rounded-full"
              style={{ width: w }}
            />
          ))}
        </div>
      ) : (
        <TagCloud categories={categories} />
      )}
    </div>
  );
}
