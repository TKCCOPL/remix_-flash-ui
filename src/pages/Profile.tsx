import { Mail, Globe, ExternalLink, Link2 } from 'lucide-react';
import { useI18n } from '../context/Preferences';

export default function Profile() {
  const t = useI18n();

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
        <div className="w-40 h-40 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-inner border-4 border-white dark:border-zinc-900 mb-4 md:mb-0">
          <img 
            src="/src/public/avatar.png" 
            alt="Profile" 
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
          />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">{t.profile.title}</h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 mb-6 font-mono text-sm leading-relaxed">{t.profile.subtitle}</p>
          
          <div className="prose prose-zinc mb-8">
            <p>{t.profile.intro1}</p>
            <p>{t.profile.intro2}</p>
            <p>{t.profile.intro3}</p>
            <p>{t.profile.projectIntro1}</p>
            <p>{t.profile.projectIntro2}</p>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.profile.interests}</h3>
            <div className="flex flex-wrap gap-2">
              {t.profile.tags.map(tag => (
                 <span key={tag} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-default">
                   {tag}
                 </span>
              ))}
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
            <a href="#" title="GitHub" className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-900 hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            <a href="#" title="Twitter" className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-[#1DA1F2] hover:text-white transition-colors">
              <ExternalLink className="w-5 h-5" />
            </a>
            <a href="#" title="LinkedIn" className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-[#0A66C2] hover:text-white transition-colors">
              <Link2 className="w-5 h-5" />
            </a>
            <a href="#" title="Email" className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-900 hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
