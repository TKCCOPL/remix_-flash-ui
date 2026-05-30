import { LogOut } from 'lucide-react';
import { useI18n } from '../context/Preferences';
import type { GuestUser } from '../api/oauth';

type UserCardProps = {
  user: GuestUser;
  favoritesCount: number;
  commentsCount: number;
  onLogout: () => void;
};

export default function UserCard({ user, favoritesCount, commentsCount, onLogout }: UserCardProps) {
  const t = useI18n();

  return (
    <div className="animate-fade-in-up">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight truncate">
              {user.username}
            </h1>
            {user.is_admin && (
              <span className="px-2 py-1 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                {t.admin.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.loginMethod(user.oauth_provider)}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          aria-label={t.profile.logout}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {favoritesCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.favorites}
          </div>
        </div>
        <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {commentsCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {t.profile.comments}
          </div>
        </div>
      </div>
    </div>
  );
}
