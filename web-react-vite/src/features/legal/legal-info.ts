/**
 * GLB-013 : les seules informations à compléter pour les pages légales, dans toutes les langues.
 * Avant la mise en ligne, plus aucun champ entre crochets (checklist « nouveau projet », section Légal).
 */
export const legalInfo = {
  /**
   * Personne ou société qui publie l'app. Un particulier qui publie à titre non professionnel peut
   * rester anonyme (LCEN, art. 6-III-2) : il donne alors ses coordonnées à l'hébergeur et indique
   * ici « Particulier », sans adresse ni téléphone personnels.
   */
  publisherName: "[NOM DE L'ÉDITEUR]",
  /** Particulier, entreprise individuelle, SAS au capital de… */
  publisherStatus: '[STATUT JURIDIQUE]',
  publisherAddress: '[ADRESSE POSTALE]',
  publisherPhone: '[TÉLÉPHONE]',
  /** SIREN ou RCS ; pour un particulier : « Non applicable ». */
  publisherRegistration: "[NUMÉRO D'IMMATRICULATION]",
  contactEmail: '[ADRESSE E-MAIL DE CONTACT]',
  publicationDirector: '[NOM DU DIRECTEUR DE LA PUBLICATION]',
  /** Date de la dernière modification des textes, au format AAAA-MM-JJ (affichée dans la langue de la page). */
  lastUpdated: '[AAAA-MM-JJ]',
  /** OPS-007 : rétention des sauvegardes de la base en production (`infra-scaleway/envs/production`). */
  backupRetentionDays: 14,
  /** Rétention des logs de l'API dans Cockpit : 7 jours par défaut chez Scaleway, à vérifier dans la console. */
  logRetentionDays: 7,
  /** Rétention des événements Sentry : dépend de l'offre (30 jours en gratuit, 90 sur les offres payantes), à vérifier. */
  errorRetentionDays: 90,
};

export type LegalInfo = typeof legalInfo;
