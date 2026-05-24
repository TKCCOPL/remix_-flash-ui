import { Link } from 'react-router-dom';
import type { ArchivePost } from '../../api/posts';

interface TimelineCardProps {
  post: ArchivePost;
}

// 用 CSS animate-slide-in-left 替代 framer-motion 的 initial/animate
// 更轻量，且自动遵循 prefers-reduced-motion
export default function TimelineCard({ post }: TimelineCardProps) {
  const date = new Date(post.created_at);
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <div
      className="group animate-slide-in-left"
      data-testid="timeline-card"
    >
      <Link 
        to={`/post/${post.id}`} 
        className="block rounded-2xl p-4 sm:p-5 -mx-4 sm:-mx-5 transition-all duration-300 hover:bg-stone-50/80 dark:hover:bg-stone-900/40 border border-transparent hover:border-stone-100 dark:hover:border-stone-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
          <div className="text-sm font-medium text-stone-400 dark:text-stone-500 shrink-0 tabular-nums">
            {monthDay}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {post.title}
            </h3>
            {post.summary && (
              <p className="text-stone-600 dark:text-stone-400 text-sm mt-2 line-clamp-2 leading-relaxed">
                {post.summary}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
