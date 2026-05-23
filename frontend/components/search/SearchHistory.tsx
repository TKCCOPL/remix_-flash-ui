import { useI18n } from '../../context/Preferences';

interface SearchHistoryProps {
  history: string[];
  onSelect: (query: string) => void;
}

export default function SearchHistory({ history, onSelect }: SearchHistoryProps) {
  const t = useI18n();

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">
        {t.search.history}
      </h3>
      <div className="flex flex-wrap gap-2">
        {history.map((query, index) => (
          <button
            key={index}
            onClick={() => onSelect(query)}
            className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}