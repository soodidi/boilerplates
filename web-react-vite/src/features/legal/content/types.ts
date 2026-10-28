import { type LegalInfo } from '../legal-info';

/** Un paragraphe, ou une liste à puces. */
export type LegalBlock = string | string[];

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  sections: LegalSection[];
};

/** Les trois pages légales d'une langue, construites à partir de `legalInfo`. */
export type LegalContent = (info: LegalInfo) => {
  notice: LegalDocument;
  privacy: LegalDocument;
  terms: LegalDocument;
};
