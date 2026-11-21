// Language context: stores the active UI language (en | te), persists it, and exposes a translation helper.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations from './translations.js';

// localStorage key where the chosen language is saved between visits.
const STORAGE_KEY = 'wellmate-language';

// Context object that carries { t, language, setLanguage } down the tree.
const LanguageContext = createContext(null);

// Read the saved language from localStorage, falling back to English if missing or invalid.
function readStoredLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'te' || saved === 'en' ? saved : 'en';
  } catch {
    // localStorage can be unavailable (e.g. privacy mode); default to English.
    return 'en';
  }
}

// Walk a dotted key like "auth.signIn" through a nested dictionary; returns undefined if any segment is missing.
function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dictionary);
}

// Provides language state and the translation function to all descendants.
export function LanguageProvider({ children }) {
  // Current language, initialised from localStorage.
  const [language, setLanguageState] = useState(readStoredLanguage);

  // Persist the language whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage failures; the in-memory state still works.
    }
  }, [language]);

  // Update the language; accepts only supported codes.
  const setLanguage = useCallback((next) => {
    if (next === 'en' || next === 'te') {
      setLanguageState(next);
    }
  }, []);

  // Translate a dotted key in the current language, falling back to English, then to the key itself.
  const t = useCallback(
    (key) => {
      const current = lookup(translations[language], key);
      if (typeof current === 'string') return current;
      const fallback = lookup(translations.en, key);
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    [language],
  );

  // Memoise the context value so consumers only re-render when language or t changes.
  const value = useMemo(() => ({ t, language, setLanguage }), [t, language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Hook returning { t, language, setLanguage } for use inside components.
export function useTranslation() {
  // Read the nearest provider's value.
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside a LanguageProvider');
  }
  return ctx;
}
