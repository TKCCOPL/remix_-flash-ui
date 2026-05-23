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
        className="flex-1 px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-stone-900 dark:text-stone-100"
      />
      <button
        type="submit"
        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
      >
        {t.search.submit}
      </button>
    </form>
  );
}