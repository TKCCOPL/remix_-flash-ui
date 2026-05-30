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
  const [animating, setAnimating] = useState(false);
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
    setAnimating(true);
    try {
      const data = await favoritesApi.toggle(postId);
      if (mountedRef.current) setFavorited(data.favorited);
    } catch {
      // silently ignore
    } finally {
      if (mountedRef.current) setLoading(false);
      setTimeout(() => {
        if (mountedRef.current) setAnimating(false);
      }, 200);
    }
  }, [loading, postId]);

  if (!user) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={favorited}
      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
        favorited
          ? 'bg-indigo-500 border-indigo-500 text-white'
          : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-400 hover:border-indigo-400 hover:text-indigo-400'
      } ${animating ? 'scale-110' : 'scale-100'}`}
    >
      <Bookmark
        className={`w-4 h-4 ${favorited ? 'fill-white' : ''}`}
      />
    </button>
  );
}
