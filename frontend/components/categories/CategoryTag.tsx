import { Link } from 'react-router-dom';

interface CategoryTagProps {
  name: string;
  slug: string;
  post_count: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
  xl: 'text-xl font-bold',
};

export default function CategoryTag({ name, slug, post_count, size }: CategoryTagProps) {
  return (
    <Link
      to={`/categories/${slug}`}
      className={`inline-block px-4 py-1.5 rounded-full transition-colors ${sizeClasses[size]} ${
        size === 'xl' || size === 'lg'
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-stone-600 dark:text-stone-400'
      } hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}
    >
      {name}
      <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">({post_count})</span>
    </Link>
  );
}
