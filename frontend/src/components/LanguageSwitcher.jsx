// Two-button language toggle; each label is the language's own name, so it is not translated.
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Supported languages, labelled in their own script.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
];

// Renders the EN / తెలుగు toggle; the active language is marked with aria-pressed.
export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  return (
    <div className="lang-switch">
      {LANGUAGES.map((option) => {
        const active = option.code === language;
        return (
          <button
            key={option.code}
            type="button"
            className="lang-switch__btn"
            aria-pressed={active}
            lang={option.code}
            onClick={() => setLanguage(option.code)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
