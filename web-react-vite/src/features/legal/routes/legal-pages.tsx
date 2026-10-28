import { useLocale } from '@/i18n';
import { LegalDocument } from '../components/legal-document';
import { legalContent } from '../content';

export function LegalNoticePage() {
  return <LegalDocument content={legalContent(useLocale()).notice} />;
}

export function PrivacyPolicyPage() {
  return <LegalDocument content={legalContent(useLocale()).privacy} />;
}

export function TermsOfUsePage() {
  return <LegalDocument content={legalContent(useLocale()).terms} />;
}
