import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { type Language, translations } from '../i18n';

export type Theme = 'light' | 'dark';

type PreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
};

const LANGUAGE_KEY = 'ui_language';
const THEME_KEY = 'ui_theme';

const getInitialLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'zh' || stored === 'en') {
    return stored;
  }
  return 'zh';
};

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      toggleLanguage: () => setLanguage(language === 'zh' ? 'en' : 'zh'),
    }),
    [language, theme]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}

export function useI18n() {
  const { language } = usePreferences();
  return translations[language];
}
