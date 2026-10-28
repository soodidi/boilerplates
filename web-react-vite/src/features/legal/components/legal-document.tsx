import { useId } from 'react';
import { type Locale, useLocale, useMessages } from '@/i18n';
import { type LegalDocument as LegalDocumentContent, type LegalSection } from '../content/types';
import { legalInfo } from '../legal-info';

/** Date AAAA-MM-JJ dans la langue de la page ; un champ encore à compléter s'affiche tel quel. */
export function formatLegalDate(value: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

/** Page légale : titre, date de mise à jour, puis une section par titre. */
export function LegalDocument({ content }: { content: LegalDocumentContent }) {
  const m = useMessages();
  const locale = useLocale();

  return (
    <article className="grid max-w-prose gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="text-sm text-muted-foreground">
          {m.legal.lastUpdated(formatLegalDate(legalInfo.lastUpdated, locale))}
        </p>
      </header>
      {content.sections.map((section) => (
        <LegalSectionView key={section.heading} section={section} />
      ))}
    </article>
  );
}

/** FE-008 : section nommée par son titre (landmark `region`), pour la navigation au lecteur d'écran. */
function LegalSectionView({ section }: { section: LegalSection }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <h2 id={headingId} className="text-xl font-semibold">
        {section.heading}
      </h2>
      {section.blocks.map((block) =>
        typeof block === 'string' ? (
          <p key={block}>{block}</p>
        ) : (
          <ul key={block.join()} className="list-disc space-y-1 pl-6">
            {block.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </section>
  );
}
