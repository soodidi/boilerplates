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

/** GLB-013 : hébergeur de l'app (OPS-005), cité par les mentions légales et la politique de confidentialité. */
export const HOST = {
  name: 'Scaleway SAS',
  address: "8, rue de la Ville-l'Évêque, 75008 Paris, France",
  phone: '+33 (0)1 84 13 00 00',
  website: 'www.scaleway.com',
};
