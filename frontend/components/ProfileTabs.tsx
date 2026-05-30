type ProfileTabsProps = {
  activeTab: 'favorites' | 'comments';
  onTabChange: (tab: 'favorites' | 'comments') => void;
  favoritesLabel: string;
  commentsLabel: string;
};

export default function ProfileTabs({
  activeTab,
  onTabChange,
  favoritesLabel,
  commentsLabel,
}: ProfileTabsProps) {
  return (
    <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
      <button
        onClick={() => onTabChange('favorites')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'favorites'
            ? 'bg-indigo-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
      >
        {favoritesLabel}
      </button>
      <button
        onClick={() => onTabChange('comments')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          activeTab === 'comments'
            ? 'bg-indigo-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }`}
      >
        {commentsLabel}
      </button>
    </div>
  );
}
