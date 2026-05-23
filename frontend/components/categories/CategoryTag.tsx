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

// 用纯 CSS :active 取代 useState 的按压状态管理，消除交互时的重渲染
export default function CategoryTag({ name, slug, post_count, size }: CategoryTagProps) {
  return (
    <Link
      to={`/categories/${slug}`}
      className={`inline-block px-4 py-1.5 rounded-full transition-all duration-150 ${sizeClasses[size]} ${
        size === 'xl' || size === 'lg'
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-stone-600 dark:text-stone-400'
      } hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:scale-105 active:scale-95 active:bg-indigo-100 dark:active:bg-indigo-900/40`}
    >
      {name}
      <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">({post_count})</span>
    </Link>
  );
}
