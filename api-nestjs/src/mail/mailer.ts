/** Un e-mail prêt à partir. `template` sert aux logs, à la place de l'adresse et du contenu (BE-009). */
export type Email = {
  template: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * BE-009 : seule porte d'envoi d'e-mails pour le code métier.
 * L'envoi part hors de la requête : `send` rend la main tout de suite et ne lève jamais.
 */
export abstract class Mailer {
  abstract send(email: Email): void;
}
