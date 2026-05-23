import { Link } from 'react-router-dom';
import type { ArchivePost } from '../../api/posts';

interface TimelineCardProps {
  post: ArchivePost;
}

export default function TimelineCard({ post }: TimelineCardProps) {
  const date = new Date(post.created_at);
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <div className="relative mb-6 group" data-testid="timeline-card">
      <div className="absolute -left-6 top-2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-stone-950"></div>
      <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 hover:shadow-md transition-shadow bg-stone-50/50 dark:bg-stone-900/60">
        <div className="text-sm text-stone-400 mb-1">{monthDay}</div>
        <Link to={`/post/${post.id}`} className="block">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {post.title}
          </h3>
        </Link>
        {post.summary && (
          <p className="text-stone-600 dark:text-stone-300 text-sm mt-2 line-clamp-2">{post.summary}</p>
        )}
      </div>
    </div>
  );
}
