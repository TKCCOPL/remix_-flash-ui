import CategoryTag from './CategoryTag';
import type { Category } from '../../api/categories';
import { useI18n } from '../../context/Preferences';

interface TagCloudProps {
  categories: Category[];
}

export default function TagCloud({ categories }: TagCloudProps) {
  const t = useI18n();

  if (categories.length === 0) {
    return <p className="text-stone-400 dark:text-stone-500">{t.categories.empty}</p>;
  }

  return (
    <div
      className="flex flex-wrap gap-4 py-8"
      data-testid="tag-cloud"
    >
      {categories.map((category, index) => (
        <div
          key={category.slug}
          className="stagger-item"
          style={{ '--stagger-index': index } as React.CSSProperties}
        >
          <CategoryTag {...category} />
        </div>
      ))}
    </div>
  );
}
