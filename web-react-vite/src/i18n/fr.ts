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
  auth: {
    signOut: 'Se déconnecter',
    fields: {
      name: 'Nom',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      newPassword: (min: number) => `Mot de passe (${min} caractères minimum)`,
    },
    login: {
      title: 'Connexion',
      submit: 'Se connecter',
      submitting: 'Connexion…',
      forgotPassword: 'Mot de passe oublié ?',
      noAccount: 'Pas encore de compte ? Créer un compte',
      resendVerification: "Renvoyer l'e-mail de confirmation",
      verificationSent: 'E-mail de confirmation envoyé.',
    },
    signup: {
      title: 'Créer un compte',
      submit: 'Créer mon compte',
      submitting: 'Création…',
      haveAccount: 'Déjà un compte ? Se connecter',
      checkInboxTitle: 'Vérifiez votre boîte mail',
      checkInbox: (email: string) =>
        `Si l'adresse ${email} peut être utilisée, un e-mail vient d'y être envoyé. Ouvrez le lien qu'il contient pour continuer.`,
      backToLogin: 'Retour à la connexion',
    },
    forgot: {
      title: 'Mot de passe oublié',
      description:
        'Saisissez votre adresse : nous vous enverrons un lien pour choisir un nouveau mot de passe.',
      submit: 'Envoyer le lien',
      submitting: 'Envoi…',
      sent: 'Si un compte existe avec cette adresse, un e-mail vient d’être envoyé.',
    },
    reset: {
      title: 'Nouveau mot de passe',
      submit: 'Enregistrer le mot de passe',
      submitting: 'Enregistrement…',
      done: 'Mot de passe modifié. Vous pouvez vous connecter.',
      invalidLink: 'Ce lien est invalide ou a expiré.',
      requestNewLink: 'Demander un nouveau lien',
    },
    errors: {
      invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.',
      emailNotVerified: 'Confirmez d’abord votre adresse e-mail, avec le lien reçu par e-mail.',
      tooManyAttempts: 'Trop de tentatives. Réessayez dans quelques minutes.',
      generic: 'Une erreur est survenue. Réessayez.',
    },
    validation: {
      email: 'Adresse e-mail invalide.',
      passwordTooShort: (min: number) => `${min} caractères minimum.`,
    },
  },
  validation: {
    required: 'Ce champ est obligatoire.',
    tooLong: (max: number) => `${max} caractères maximum.`,
  },
};

export type Messages = typeof fr;
