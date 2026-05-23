import TimelineCard from './TimelineCard';
import type { ArchiveMonth } from '../../api/posts';
import { useI18n } from '../../context/Preferences';

interface YearSectionProps {
  year: number;
  months: ArchiveMonth[];
}

export default function YearSection({ year, months }: YearSectionProps) {
  const t = useI18n();
  const totalPosts = months.reduce((sum, month) => sum + month.posts.length, 0);

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{year}</h2>
        <span className="ml-3 text-sm text-stone-400">
          {t.archive.postCount.replace('{count}', String(totalPosts))}
        </span>
      </div>
      <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900">
        {months.map((month) => (
          <div key={month.month} className="mb-6">
            <div className="text-sm font-medium text-stone-400 mb-3">
              {month.month}月
            </div>
            {month.posts.map((post) => (
              <TimelineCard key={post.id} post={post} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
