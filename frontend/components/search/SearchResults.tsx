import { Link } from 'react-router-dom';
import { useI18n } from '../../context/Preferences';
import type { SearchResult } from '../../api/posts';

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  query: string;
}

export default function SearchResults({ results, total, query }: SearchResultsProps) {
  const t = useI18n();

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-stone-500 dark:text-stone-400">
          {t.search.noResults.replace('{query}', query)}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="search-results">
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
        {t.search.foundCount.replace('{count}', String(total))}
      </p>
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <Link to={`/post/${result.id}`} className="block">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 hover:text-stone-600 dark:hover:text-stone-300 mb-2">
                {result.title}
              </h3>
            </Link>
            <p className="text-stone-600 dark:text-stone-300 text-sm mb-2">{result.summary}</p>
            <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              {result.category && (
                <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">
                  {result.category}
                </span>
              )}
              <span>{new Date(result.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}