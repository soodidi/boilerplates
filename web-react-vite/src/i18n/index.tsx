import { createContext, type ReactNode, use, useEffect } from 'react';
import { en } from './en';
import { fr, type Messages } from './fr';

/**
 * i18n minimal et typé (GLB-007). Pour du pluriel ICU ou beaucoup de langues,
 * remplacer par une librairie dédiée (Lingui, i18next) via un ADR projet.
 */
const catalogs = { fr, en } satisfies Record<string, Messages>;

export type Locale = keyof typeof catalogs;
export type { Messages };

const DEFAULT_LOCALE: Locale = 'fr';

function isLocale(value: string): value is Locale {
  return Object.hasOwn(catalogs, value);
}

export function detectLocale(): Locale {
  const language = navigator.language.slice(0, 2);
  return isLocale(language) ? language : DEFAULT_LOCALE;
}

const MessagesContext = createContext<Messages>(catalogs[DEFAULT_LOCALE]);
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext value={locale}>
      <MessagesContext value={catalogs[locale]}>{children}</MessagesContext>
    </LocaleContext>
  );
}

export function useMessages(): Messages {
  return use(MessagesContext);
}

/** Langue courante, pour les contenus longs chargés à la demande hors des catalogues (pages légales). */
export function useLocale(): Locale {
  return use(LocaleContext);
}
