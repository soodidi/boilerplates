import { type Locale } from '@/i18n';
import { legalInfo } from '../legal-info';
import { en } from './en';
import { fr } from './fr';
import { type LegalContent } from './types';

const contents = { fr, en } satisfies Record<Locale, LegalContent>;

/** Textes légaux de la langue courante, complétés avec `legalInfo`. */
export function legalContent(locale: Locale) {
  return contents[locale](legalInfo);
}
