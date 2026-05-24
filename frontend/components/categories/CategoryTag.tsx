import { Link } from 'react-router-dom';

interface CategoryTagProps {
  name: string;
  slug: string;
  post_count: number;
}

export default function CategoryTag({ name, slug, post_count }: CategoryTagProps) {
  return (
    <Link
      to={`/categories/${slug}`}
      className="group flex items-center gap-3 px-4 py-2.5 rounded-full bg-stone-50 hover:bg-stone-100 dark:bg-stone-900/50 dark:hover:bg-stone-800 transition-all duration-300 border border-stone-200/50 dark:border-stone-800"
    >
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {name}
      </span>
      <span className="flex items-center justify-center min-w-6 h-6 px-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 rounded-full">
        {post_count}
      </span>
    </Link>
  );
}
