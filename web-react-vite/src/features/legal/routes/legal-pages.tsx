import { useLocale } from '@/i18n';
import { LegalDocument } from '../components/legal-document';
import { legalContent } from '../content';

export function LegalNoticePage() {
  return <LegalDocument document={legalContent(useLocale()).notice} />;
}

export function PrivacyPolicyPage() {
  return <LegalDocument document={legalContent(useLocale()).privacy} />;
}

export function TermsOfUsePage() {
  return <LegalDocument document={legalContent(useLocale()).terms} />;
}
