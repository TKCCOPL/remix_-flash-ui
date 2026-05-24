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
    <div className="mb-16">
      <div className="flex items-center mb-8">
        <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">{year}</h2>
        <span className="ml-4 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/80 text-xs font-medium text-stone-500 dark:text-stone-400">
          {t.archive.postCount.replace('{count}', String(totalPosts))}
        </span>
      </div>
      <div className="relative space-y-12">
        {months.map((month) => (
          <div key={month.month}>
            <div className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-5 flex items-center gap-4">
              {month.month}月
              <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800/60" />
            </div>
            <div className="space-y-3">
            {month.posts.map((post) => (
              <TimelineCard key={post.id} post={post} />
            ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
