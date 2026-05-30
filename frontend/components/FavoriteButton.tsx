import { useState, useEffect, useRef, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { favoritesApi } from '../api/favorites';

type Props = {
  postId: number | string;
};

export default function FavoriteButton({ postId }: Props) {
  const t = useI18n();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      try {
        const data = await favoritesApi.check(postId);
        if (!cancelled && mountedRef.current) setFavorited(data.favorited);
      } catch {
        // silently ignore
      }
    };

    void check();
    return () => { cancelled = true; };
  }, [user?.id, postId]);

  const handleToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await favoritesApi.toggle(postId);
      if (mountedRef.current) setFavorited(data.favorited);
    } catch {
      // silently ignore
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [loading, postId]);

  if (!user) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={favorited}
      className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
        favorited
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
    >
      <Bookmark
        className={`w-4 h-4 transition-colors ${
          favorited ? 'fill-indigo-600 dark:fill-indigo-400' : ''
        }`}
      />
      {favorited ? t.post.favorited : t.post.favorite}
    </button>
  );
}
