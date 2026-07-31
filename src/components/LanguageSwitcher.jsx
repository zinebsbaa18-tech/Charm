import { useState } from 'react';
import { useLang } from '../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', full: 'Français', flag: '🇫🇷' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        id="lang-switcher-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-label-lg font-body px-3 py-1.5 rounded-full hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-[20px]">language</span>
        <span>{current.label}</span>
        <span className="material-symbols-outlined text-[16px]">expand_more</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-surface-container-lowest rounded-2xl shadow-mediterranean border border-outline-variant/30 overflow-hidden animate-scale-in z-50">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              id={`lang-${l.code}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-label-lg transition-colors hover:bg-surface-container ${lang === l.code ? 'text-primary font-semibold bg-primary/5' : 'text-on-surface'}`}
            >
              <span className="text-xl">{l.flag}</span>
              <span>{l.full}</span>
              {lang === l.code && <span className="material-symbols-outlined text-primary text-[18px] ms-auto">check</span>}
            </button>
          ))}
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
