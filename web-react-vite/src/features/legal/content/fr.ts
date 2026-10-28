import { HOST, type LegalContent } from './types';

/** Modèles à relire avant la mise en ligne : ils décrivent l'app telle que livrée par le boilerplate. */
export const fr: LegalContent = (info) => ({
  notice: {
    title: 'Mentions légales',
    sections: [
      {
        heading: 'Éditeur',
        blocks: [
          `Cette application est éditée par ${info.publisherName} (${info.publisherStatus}), ${info.publisherAddress}.`,
          `Immatriculation : ${info.publisherRegistration}.`,
          `Contact : ${info.contactEmail}.`,
        ],
      },
      {
        heading: 'Directeur de la publication',
        blocks: [info.publicationDirector],
      },
      {
        heading: 'Hébergeur',
        blocks: [
          HOST.name,
          `Siège social : ${HOST.address}`,
          `Téléphone : ${HOST.phone}`,
          `Site internet : ${HOST.website}`,
        ],
      },
      {
        heading: 'Données personnelles',
        blocks: [
          'Le traitement de vos données est décrit dans la politique de confidentialité, accessible en bas de chaque page.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    sections: [
      {
        heading: 'Responsable du traitement',
        blocks: [
          `${info.publisherName}, ${info.publisherAddress}. Pour toute question sur vos données : ${info.contactEmail}.`,
        ],
      },
      {
        heading: 'Données collectées',
        blocks: [
          'Nous collectons uniquement ce qui est nécessaire au service :',
          [
            'votre compte : nom, adresse e-mail et mot de passe, conservé uniquement sous une forme irréversible (hachage) ;',
            'vos sessions de connexion : adresse IP et type de navigateur ou d’appareil, pour sécuriser votre compte ;',
            'les contenus que vous créez dans l’application.',
          ],
        ],
      },
      {
        heading: 'Finalités et bases légales',
        blocks: [
          [
            'fournir le service et gérer votre compte : exécution du contrat (conditions d’utilisation) ;',
            'vous envoyer les e-mails du service (confirmation d’adresse, nouveau mot de passe) : exécution du contrat ;',
            'protéger votre compte et l’application contre les abus : intérêt légitime.',
          ],
          'Vos données ne sont ni vendues, ni utilisées à des fins publicitaires.',
        ],
      },
      {
        heading: 'Durées de conservation',
        blocks: [
          [
            'compte et contenus : jusqu’à la suppression de votre compte ;',
            'sessions : 30 jours après leur dernière utilisation, et jamais plus de 90 jours ;',
            'liens envoyés par e-mail : jusqu’à leur expiration, une heure au plus ;',
            `sauvegardes de la base de données : ${info.backupRetentionDays} jours. Une donnée supprimée disparaît des sauvegardes à l’issue de ce délai.`,
          ],
        ],
      },
      {
        heading: 'Destinataires et sous-traitants',
        blocks: [
          'Vos données ne sont accessibles qu’à l’éditeur et aux prestataires suivants, pour les seuls besoins du service :',
          [
            `${HOST.name} (France) : hébergement de l’application et de la base de données, envoi des e-mails ;`,
            'Sentry (Functional Software, Inc.) : détection des erreurs techniques, données hébergées dans l’Union européenne, sans donnée personnelle ;',
            'Apple et Google : distribution des applications mobiles, si vous les utilisez.',
          ],
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          'L’application utilise un seul cookie : le cookie de session, qui vous garde connecté. Il est strictement nécessaire au service et ne demande donc pas votre consentement. Aucun traceur publicitaire ni outil de mesure d’audience n’est utilisé.',
        ],
      },
      {
        heading: 'Vos droits',
        blocks: [
          'Depuis la page « Mon compte », vous pouvez à tout moment :',
          [
            'exporter toutes vos données dans un fichier (droit d’accès et de portabilité) ;',
            'supprimer votre compte et toutes vos données, immédiatement et définitivement (droit à l’effacement).',
          ],
          `Vous pouvez aussi demander la rectification de vos données, ou vous opposer à un traitement, en écrivant à ${info.contactEmail}. Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).`,
        ],
      },
      {
        heading: 'Sécurité',
        blocks: [
          'Les échanges sont chiffrés (HTTPS), les mots de passe hachés avec Argon2id, et vos sessions peuvent être révoquées à tout moment, en vous déconnectant ou en changeant de mot de passe.',
        ],
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    sections: [
      {
        heading: 'Objet',
        blocks: [
          `Les présentes conditions encadrent l’utilisation de l’application éditée par ${info.publisherName}. Créer un compte vaut acceptation de ces conditions.`,
        ],
      },
      {
        heading: 'Accès au service',
        blocks: [
          'Le service est accessible à toute personne disposant d’un compte. L’éditeur s’efforce de le rendre disponible en permanence, sans pouvoir le garantir : il peut être interrompu pour maintenance ou en cas de panne.',
        ],
      },
      {
        heading: 'Compte',
        blocks: [
          'Vous vous engagez à fournir une adresse e-mail valide et à garder votre mot de passe confidentiel. Toute action faite depuis votre compte est réputée faite par vous.',
        ],
      },
      {
        heading: 'Contenus',
        blocks: [
          'Vous restez propriétaire des contenus que vous créez, et seul responsable de ceux-ci. Ils ne doivent enfreindre ni la loi, ni les droits d’un tiers. L’éditeur peut retirer un contenu manifestement illicite qui lui est signalé.',
        ],
      },
      {
        heading: 'Suppression du compte',
        blocks: [
          'Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte » ; vos données sont alors effacées. L’éditeur peut suspendre ou supprimer un compte en cas de manquement grave aux présentes conditions.',
        ],
      },
      {
        heading: 'Responsabilité',
        blocks: [
          'Le service est fourni en l’état. Dans les limites permises par la loi, l’éditeur n’est pas responsable des dommages indirects liés à son utilisation, ni de la perte de contenus : exportez régulièrement vos données si elles sont importantes pour vous.',
        ],
      },
      {
        heading: 'Données personnelles',
        blocks: ['Le traitement de vos données est décrit dans la politique de confidentialité.'],
      },
      {
        heading: 'Modification des conditions',
        blocks: [
          'L’éditeur peut modifier ces conditions. La date de mise à jour figure en haut de la page ; en cas de changement important, vous en serez informé par e-mail.',
        ],
      },
      {
        heading: 'Droit applicable',
        blocks: [
          `Ces conditions sont soumises au droit français. En cas de litige, contactez d’abord l’éditeur à ${info.contactEmail} pour trouver une solution amiable.`,
        ],
      },
    ],
  },
});
