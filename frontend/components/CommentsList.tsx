import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { MessageCircle } from 'lucide-react';
import type { ApiComment } from '../api/comments';
import EmptyState from './EmptyState';

type CommentsListProps = {
  comments: ApiComment[];
  loading: boolean;
};

export default function CommentsList({ comments, loading }: CommentsListProps) {
  const t = useI18n();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 animate-pulse"
          >
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-full" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-8 h-8 text-stone-400" />}
        title={t.profile.noComments}
        description={t.profile.noCommentsDesc}
        action={{
          label: t.profile.browseArticles,
          onClick: () => navigate('/'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800"
        >
          <div
            onClick={() => navigate(`/post/${comment.post_id}`)}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer mb-2"
          >
            {comment.post_title}
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {comment.content}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
            {new Date(comment.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
