import { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(localStorage.getItem('charm-lang') || '');

  const setLang = (code) => {
    setLangState(code);
    localStorage.setItem('charm-lang', code);
    i18n.changeLanguage(code);
    document.documentElement.setAttribute('lang', code);
  };

  useEffect(() => {
    if (lang) {
      document.documentElement.setAttribute('lang', lang);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
};
