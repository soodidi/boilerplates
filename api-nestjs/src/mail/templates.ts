import { type Email } from './mailer.js';

/** Échappe une valeur insérée dans le HTML d'un e-mail (BE-009). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type LinkEmailParams = {
  to: string;
  appName: string;
  url: string;
};

/** Gabarit commun : un paragraphe, un bouton vers `url`, le lien en clair et une note. */
function linkEmail(
  template: string,
  { to, appName, url }: LinkEmailParams,
  content: { subject: string; intro: string; action: string; note: string },
): Email {
  const subject = `${appName} : ${content.subject}`;
  const text = [content.intro, '', `${content.action} : ${url}`, '', content.note].join('\n');
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: sans-serif; line-height: 1.5; color: #111">
    <p>${escapeHtml(content.intro)}</p>
    <p><a href="${escapeHtml(url)}" style="display: inline-block; padding: 10px 16px; background: #111; color: #fff; text-decoration: none; border-radius: 6px">${escapeHtml(content.action)}</a></p>
    <p style="font-size: 13px; color: #555">Si le bouton ne fonctionne pas, copiez ce lien : ${escapeHtml(url)}</p>
    <p style="font-size: 13px; color: #555">${escapeHtml(content.note)}</p>
  </body>
</html>`;
  return { template, to, subject, text, html };
}

/** Vérification de l'adresse après l'inscription (BE-006). */
export function verifyEmail(params: LinkEmailParams): Email {
  return linkEmail('verify-email', params, {
    subject: 'confirmez votre adresse e-mail',
    intro: `Bienvenue sur ${params.appName}. Confirmez votre adresse e-mail pour activer votre compte.`,
    action: 'Confirmer mon adresse',
    note: "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.",
  });
}

/** Lien de réinitialisation du mot de passe (BE-006). */
export function resetPasswordEmail(params: LinkEmailParams): Email {
  return linkEmail('reset-password', params, {
    subject: 'réinitialisez votre mot de passe',
    intro: `Une réinitialisation du mot de passe de votre compte ${params.appName} a été demandée.`,
    action: 'Choisir un nouveau mot de passe',
    note: "Ce lien expire bientôt. Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe ne change pas.",
  });
}

/** Inscription avec une adresse déjà utilisée : on prévient le vrai propriétaire (BE-006). */
export function existingAccountEmail(params: LinkEmailParams): Email {
  return linkEmail('existing-account', params, {
    subject: 'vous avez déjà un compte',
    intro: `Quelqu'un a tenté de créer un compte ${params.appName} avec votre adresse e-mail, qui en a déjà un.`,
    action: 'Me connecter',
    note: "Si ce n'était pas vous, ignorez cet e-mail : aucun compte n'a été créé et le vôtre n'a pas changé.",
  });
}
