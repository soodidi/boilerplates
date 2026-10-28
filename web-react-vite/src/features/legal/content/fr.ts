import { HOST } from './host';
import { type LegalContent } from './types';

/** Modèles à relire avant la mise en ligne : ils décrivent l'app telle que livrée par le boilerplate. */
export const fr: LegalContent = (info) => ({
  notice: {
    title: 'Mentions légales',
    sections: [
      {
        heading: 'Éditeur',
        blocks: [
          `Cette application est éditée par ${info.publisherName} (${info.publisherStatus}), ${info.publisherAddress}.`,
          `Téléphone : ${info.publisherPhone}. Contact : ${info.contactEmail}.`,
          `Immatriculation : ${info.publisherRegistration}.`,
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
          'L’éditeur ne collecte que ce qui est nécessaire au service :',
          [
            'votre compte : nom, adresse e-mail et mot de passe, conservé uniquement sous une forme irréversible (hachage) ;',
            'vos sessions de connexion : adresse IP et type de navigateur ou d’appareil, pour sécuriser votre compte ;',
            'votre adresse IP, le temps de limiter les tentatives répétées de connexion ou d’inscription ;',
            'les contenus que vous créez dans l’application.',
          ],
        ],
      },
      {
        heading: 'Finalités et bases légales',
        blocks: [
          [
            'fournir le service et gérer votre compte : exécution du contrat (conditions d’utilisation) ;',
            'vous envoyer les e-mails du service (confirmation d’adresse, réinitialisation du mot de passe, alerte en cas d’inscription avec votre adresse) : exécution du contrat ;',
            'protéger votre compte et l’application contre les abus, et corriger les erreurs techniques : intérêt légitime.',
          ],
          'Vos données ne sont ni vendues, ni utilisées à des fins publicitaires.',
        ],
      },
      {
        heading: 'Durées de conservation',
        blocks: [
          [
            'compte et contenus : jusqu’à la suppression de votre compte ;',
            'sessions : valables 30 jours après leur dernière utilisation et 90 jours au plus après la connexion, puis effacées dans les 24 heures ;',
            'adresse IP utilisée pour limiter les tentatives : 48 heures au plus après la dernière tentative ;',
            'liens envoyés par e-mail : jusqu’à leur expiration, une heure au plus, puis effacés dans les 24 heures ;',
            `journaux techniques du serveur (adresses demandées, résultats, sans adresse IP ni navigateur) : ${info.logRetentionDays} jours ;`,
            `rapports d’erreurs techniques : ${info.errorRetentionDays} jours ;`,
            `sauvegardes de la base de données : ${info.backupRetentionDays} jours. Une donnée supprimée disparaît des sauvegardes à l’issue de ce délai.`,
          ],
        ],
      },
      {
        heading: 'Destinataires et sous-traitants',
        blocks: [
          'Vos données ne sont accessibles qu’à l’éditeur et aux prestataires suivants, pour les seuls besoins du service :',
          [
            `${HOST.name} (France) : hébergement de l’application et de la base de données, journaux techniques, envoi des e-mails ; sauvegardes copiées dans une autre région de l’Union européenne ;`,
            'Sentry (Functional Software, Inc., États-Unis) : rapports d’erreurs techniques (page consultée, navigateur et système, déroulement de l’erreur), sans nom, adresse e-mail, adresse IP ni contenu, hébergés dans l’Union européenne ; un éventuel accès depuis les États-Unis est encadré par les clauses contractuelles types de la Commission européenne ;',
            'Apple et Google : distribution des applications mobiles, si vous les utilisez.',
          ],
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          'L’application utilise un seul cookie, le cookie de session qui vous garde connecté, et une donnée technique dans le stockage de votre navigateur pour synchroniser la connexion entre vos onglets. Tous deux sont strictement nécessaires au service et ne demandent donc pas votre consentement. Aucun traceur publicitaire ni outil de mesure d’audience n’est utilisé.',
        ],
      },
      {
        heading: 'Vos droits',
        blocks: [
          'Depuis la page « Mon compte », vous pouvez à tout moment :',
          [
            'exporter toutes vos données dans un fichier (droit d’accès et de portabilité) ;',
            `supprimer votre compte et toutes vos données, immédiatement et définitivement (droit à l’effacement) ; seules les sauvegardes les conservent, ${info.backupRetentionDays} jours au plus.`,
          ],
          `Vous pouvez aussi demander la rectification de vos données, la limitation de leur traitement, vous opposer à un traitement, ou définir des directives sur leur sort après votre décès, en écrivant à ${info.contactEmail}. Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).`,
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
          `Les présentes conditions encadrent l’utilisation de l’application éditée par ${info.publisherName}. En créant un compte, vous les acceptez.`,
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
          'Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte » ; vos données sont alors effacées. L’éditeur peut suspendre ou supprimer un compte en cas de manquement grave aux présentes conditions, après vous en avoir informé par e-mail.',
        ],
      },
      {
        heading: 'Responsabilité',
        blocks: [
          'L’éditeur met en œuvre les moyens raisonnables pour assurer le bon fonctionnement du service et la conservation de vos contenus, notamment par des sauvegardes régulières. Vous pouvez exporter vos données à tout moment depuis la page « Mon compte ».',
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
