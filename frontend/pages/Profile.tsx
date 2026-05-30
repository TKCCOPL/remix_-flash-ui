import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { favoritesApi, type ApiFavorite } from '../api/favorites';
import { commentsApi, type ApiComment } from '../api/comments';
import UserCard from '../components/UserCard';
import ProfileTabs from '../components/ProfileTabs';
import FavoritesList from '../components/FavoritesList';
import CommentsList from '../components/CommentsList';

export default function Profile() {
  const t = useI18n();
  const navigate = useNavigate();
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'favorites' | 'comments'>('favorites');
  const [favorites, setFavorites] = useState<ApiFavorite[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Fetch favorites
  useEffect(() => {
    if (!user && !isAdmin) return;
    let cancelled = false;

    const fetchFavorites = async () => {
      try {
        const data = await favoritesApi.list();
        if (!cancelled) setFavorites(data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingFavorites(false);
      }
    };

    void fetchFavorites();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch comments
  useEffect(() => {
    if (!user && !isAdmin) return;
    let cancelled = false;

    const fetchComments = async () => {
      try {
        const data = await commentsApi.listByUser();
        if (!cancelled) setComments(data);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };

    void fetchComments();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (authLoading || (!user && !isAdmin)) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-20 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Create user object for admin or use existing user
  const displayUser = user || (isAdmin ? {
    id: null,
    username: 'admin',
    avatar_url: null,
    email: null,
    oauth_provider: 'admin',
  } : null);

  if (!displayUser) return null;

  return (
    <div className="w-full max-w-2xl mx-auto py-8 space-y-8">
      {/* User Card */}
      <UserCard
        user={displayUser}
        favoritesCount={favorites.length}
        commentsCount={comments.length}
        onLogout={handleLogout}
      />

      {/* Tabs and Content */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          favoritesLabel={t.profile.favorites}
          commentsLabel={t.profile.comments}
        />

        <div className="mt-6">
          {activeTab === 'favorites' ? (
            <FavoritesList favorites={favorites} loading={loadingFavorites} />
          ) : (
            <CommentsList comments={comments} loading={loadingComments} />
          )}
        </div>
      </div>
    </div>
  );
}
