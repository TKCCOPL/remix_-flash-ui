import { useState, useEffect } from 'react';
import { postsApi } from '../api/posts';
import type { SearchResult } from '../api/posts';
import SearchInput from '../components/search/SearchInput';
import SearchHistory from '../components/search/SearchHistory';
import SearchResults from '../components/search/SearchResults';
import { useI18n } from '../context/Preferences';

const HOT_SEARCHES = ['前端开发', '后端架构', '数据库', 'React', 'Python'];

export default function SearchPage() {
  const t = useI18n();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (newQuery: string) => {
    const updatedHistory = [newQuery, ...history.filter(q => q !== newQuery)].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setLoading(true);
    setError(null);

    try {
      const data = await postsApi.search(searchQuery);
      setResults(data.results);
      setTotal(data.total);
      addToHistory(searchQuery);
    } catch {
      setError(t.search.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-8">
        {t.search.placeholder.replace('...', '')}
      </h1>

      <div className="max-w-3xl mx-auto">
        <SearchInput onSearch={handleSearch} initialValue={query} />

        {!query && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <SearchHistory history={history} onSelect={handleSearch} />
            <div>
              <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">
                {t.search.hotSearches}
              </h3>
              <div className="flex flex-wrap gap-2">
                {HOT_SEARCHES.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSearch(item)}
                    className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800 dark:border-stone-200 mx-auto"></div>
            <p className="mt-2 text-stone-500 dark:text-stone-400">{t.search.loading}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-stone-500">{error}</div>
        )}

        {query && !loading && !error && (
          <SearchResults results={results} total={total} query={query} />
        )}
      </div>
    </div>
  );
}