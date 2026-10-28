import { lazyRouteComponent } from '@tanstack/react-router';

// API publique de la feature (FE-003). Le reste de l'app n'importe que ce fichier.

/** FE-008 : les textes légaux, longs, ne sont chargés qu'avec leurs pages. */
const legalPage = <T extends 'LegalNoticePage' | 'PrivacyPolicyPage' | 'TermsOfUsePage'>(name: T) =>
  lazyRouteComponent(() => import('./routes/legal-pages'), name);

export const LegalNoticePage = legalPage('LegalNoticePage');
export const PrivacyPolicyPage = legalPage('PrivacyPolicyPage');
export const TermsOfUsePage = legalPage('TermsOfUsePage');

export { LegalFooter } from './components/legal-footer';
