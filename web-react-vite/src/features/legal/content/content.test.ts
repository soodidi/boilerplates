import { describe, expect, it } from 'vitest';
import { legalInfo } from '../legal-info';
import { legalContent } from '.';

const documents = ['notice', 'privacy', 'terms'] as const;

describe('legalContent', () => {
  it('a la même structure en français et en anglais', () => {
    const shape = (locale: 'fr' | 'en') =>
      documents.map((name) =>
        legalContent(locale)[name].sections.map((section) =>
          section.blocks.map((block) => (typeof block === 'string' ? 'p' : block.length)),
        ),
      );

    expect(shape('en')).toEqual(shape('fr'));
  });

  it.each(['fr', 'en'] as const)('utilise toutes les informations à compléter (%s)', (locale) => {
    const text = JSON.stringify(legalContent(locale));
    // La date de mise à jour est affichée par la page elle-même.
    const { lastUpdated: _lastUpdated, ...fields } = legalInfo;

    for (const value of Object.values(fields)) expect(text).toContain(String(value));
  });
});
