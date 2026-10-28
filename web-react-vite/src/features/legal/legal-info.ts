/**
 * GLB-013 : les seules informations à compléter pour les pages légales, dans toutes les langues.
 * Avant la mise en ligne, plus aucun champ entre crochets (checklist « nouveau projet », section Légal).
 */
export const legalInfo = {
  /** Personne ou société qui publie l'app. */
  publisherName: "[NOM DE L'ÉDITEUR]",
  /** Particulier, entreprise individuelle, SAS… avec le capital social pour une société. */
  publisherStatus: '[STATUT JURIDIQUE]',
  publisherAddress: '[ADRESSE POSTALE]',
  /** SIREN ou RCS ; pour un particulier : « Non applicable ». */
  publisherRegistration: "[NUMÉRO D'IMMATRICULATION]",
  contactEmail: '[ADRESSE E-MAIL DE CONTACT]',
  publicationDirector: '[NOM DU DIRECTEUR DE LA PUBLICATION]',
  /** Date de la dernière modification des textes, au format de la langue (ex. « 28 octobre 2026 »). */
  lastUpdated: '[DATE DE MISE À JOUR]',
  /** OPS-007 : rétention des sauvegardes de la base en production (`infra-scaleway`). */
  backupRetentionDays: 14,
};

export type LegalInfo = typeof legalInfo;
