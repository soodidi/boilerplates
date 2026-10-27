import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEMO_USER, signInAsDemo } from '@/mocks/db';
import { renderRoute } from '@/test/render';

describe('SignupPage', () => {
  it('invite à vérifier sa boîte mail après l’inscription', async () => {
    const user = userEvent.setup();
    renderRoute('/signup');

    await user.type(await screen.findByRole('textbox', { name: 'Nom' }), 'Ada');
    await user.type(screen.getByRole('textbox', { name: 'Adresse e-mail' }), 'ada@example.com');
    await user.type(screen.getByLabelText(/^Mot de passe/), 'a long enough password');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible();
  });

  it('refuse un mot de passe trop court', async () => {
    const user = userEvent.setup();
    renderRoute('/signup');

    await user.type(await screen.findByLabelText(/^Mot de passe/), 'short');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('12 caractères minimum.')).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage', () => {
  it.each(['nobody@example.com', DEMO_USER.email])(
    'confirme l’envoi sans dire si le compte existe (%s)',
    async (email) => {
      const user = userEvent.setup();
      renderRoute('/forgot-password');

      await user.type(await screen.findByRole('textbox', { name: 'Adresse e-mail' }), email);
      await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Si un compte existe avec cette adresse',
      );
    },
  );
});

describe('ResetPasswordPage', () => {
  it('signale un lien invalide ou expiré', async () => {
    renderRoute('/reset-password?error=INVALID_TOKEN');

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce lien est invalide ou a expiré.');
  });

  it('signale un lien déjà utilisé ou expiré à l’envoi du formulaire', async () => {
    const user = userEvent.setup();
    renderRoute('/reset-password?token=used-token');

    await user.type(await screen.findByLabelText(/^Mot de passe/), 'a brand new long password');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce lien est invalide ou a expiré.');
  });

  it('enregistre le nouveau mot de passe', async () => {
    const user = userEvent.setup();
    renderRoute('/reset-password?token=valid-token');

    await user.type(await screen.findByLabelText(/^Mot de passe/), 'a brand new long password');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Mot de passe modifié.');
  });
});

describe('AccountMenu', () => {
  it('déconnecte l’utilisateur et le renvoie à l’accueil', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    const { router } = renderRoute('/notes');

    expect(await screen.findByText(DEMO_USER.email)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await expect.poll(() => router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('link', { name: 'Connexion' })).toBeInTheDocument();
  });
});
