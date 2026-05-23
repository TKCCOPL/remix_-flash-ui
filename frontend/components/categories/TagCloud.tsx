import CategoryTag from './CategoryTag';
import type { Category } from '../../api/categories';
import { useI18n } from '../../context/Preferences';

interface TagCloudProps {
  categories: Category[];
}

function getSize(count: number, maxCount: number): 'sm' | 'md' | 'lg' | 'xl' {
  const ratio = count / maxCount;
  if (ratio > 0.8) return 'xl';
  if (ratio > 0.6) return 'lg';
  if (ratio > 0.4) return 'md';
  return 'sm';
}

export default function TagCloud({ categories }: TagCloudProps) {
  const t = useI18n();

  if (categories.length === 0) {
    return <p className="text-stone-400 dark:text-stone-500">{t.categories.empty}</p>;
  }

  const maxCount = Math.max(...categories.map((c) => c.post_count));

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center py-8" data-testid="tag-cloud">
      {categories.map((category) => (
        <CategoryTag
          key={category.slug}
          {...category}
          size={getSize(category.post_count, maxCount)}
        />
      ))}
    </div>
  );
}
