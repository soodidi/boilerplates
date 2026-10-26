/** Textes de l'interface (GLB-007 : aucun texte affiché en dur dans les composants). */
export const fr = {
  app: {
    name: 'Mon app',
    skipToContent: 'Aller au contenu',
    mainNavigation: 'Navigation principale',
    nav: { home: 'Accueil', notes: 'Notes' },
  },
  errors: {
    title: 'Une erreur est survenue',
    description: "L'équipe a été prévenue. Vous pouvez réessayer.",
    reload: 'Recharger la page',
    retry: 'Réessayer',
    notFoundTitle: 'Page introuvable',
    backHome: "Retour à l'accueil",
  },
  home: {
    title: 'Bienvenue',
    description:
      'Ce boilerplate applique les règles du repo engineering-guidelines. La page Notes montre une feature complète : requêtes, filtres dans l’URL et formulaire.',
    cta: 'Voir les notes',
  },
  notes: {
    title: 'Notes',
    searchLabel: 'Rechercher une note',
    listLabel: 'Liste des notes',
    empty: 'Aucune note pour le moment.',
    noResults: (query: string) => `Aucune note ne correspond à « ${query} ».`,
    loading: 'Chargement des notes…',
    form: {
      title: 'Nouvelle note',
      titleLabel: 'Titre',
      contentLabel: 'Contenu',
      submit: 'Ajouter la note',
      submitting: 'Ajout en cours…',
      success: 'Note ajoutée.',
      error: "La note n'a pas pu être ajoutée.",
    },
  },
  validation: {
    required: 'Ce champ est obligatoire.',
    tooLong: (max: number) => `${max} caractères maximum.`,
  },
};

export type Messages = typeof fr;
