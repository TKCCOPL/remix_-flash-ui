import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useI18n, usePreferences } from '../context/Preferences';
import { locales, dateFormats } from '../i18n';
import { Bookmark } from 'lucide-react';
import type { ApiFavorite } from '../api/favorites';
import EmptyState from './EmptyState';

type FavoritesListProps = {
  favorites: ApiFavorite[];
  loading: boolean;
};

export default function FavoritesList({ favorites, loading }: FavoritesListProps) {
  const t = useI18n();
  const navigate = useNavigate();
  const { language } = usePreferences();
  const locale = locales[language];
  const dateFormat = dateFormats[language].medium;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 animate-pulse"
          >
            <div className="w-20 h-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="w-8 h-8 text-stone-400" />}
        title={t.profile.noFavorites}
        description={t.profile.noFavoritesDesc}
        action={{
          label: t.profile.browseArticles,
          onClick: () => navigate('/'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          onClick={() => navigate(`/post/${fav.post_id}`)}
          className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors"
        >
          {fav.image_url ? (
            <img
              src={fav.image_url}
              alt={fav.title}
              className="w-20 h-16 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">
              {fav.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {fav.category}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {format(new Date(fav.created_at), dateFormat, { locale })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
