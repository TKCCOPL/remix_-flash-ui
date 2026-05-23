import { useState } from 'react';
import { useI18n } from '../../context/Preferences';

interface SearchInputProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export default function SearchInput({ onSearch, initialValue = '' }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const t = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search.placeholder}
        className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 dark:bg-stone-800 dark:text-white"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
      >
        {t.search.submit}
      </button>
    </form>
  );
}