import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db, DEMO_USER, OTHER_USER, signInAsDemo, UNVERIFIED_USER } from '@/mocks/db';
import { renderRoute } from '@/test/render';

/** Navigation avec chargement des pages à la demande : plus lente que le délai par défaut. */
const NAVIGATION = { timeout: 3000 };

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Adresse e-mail' }), email);
  await user.type(screen.getByLabelText('Mot de passe'), password);
  await user.click(screen.getByRole('button', { name: 'Se connecter' }));
  return user;
}

describe('LoginPage', () => {
  it('redirige une page privée vers la connexion, puis y revient une fois connecté', async () => {
    const { router } = renderRoute('/notes?q=api');

    await screen.findByRole('heading', { name: 'Connexion' });
    expect(router.state.location.pathname).toBe('/login');

    await fillAndSubmit(DEMO_USER.email, DEMO_USER.password);

    await expect.poll(() => router.state.location.pathname, NAVIGATION).toBe('/notes');
    expect(router.state.location.search).toEqual({ q: 'api' });
  });

  it.each([
    [DEMO_USER.email, 'wrong password'],
    ['nobody@example.com', 'any password'],
  ])(
    'affiche le même message pour une adresse inconnue et un mauvais mot de passe (%s)',
    async (email, password) => {
      renderRoute('/login');

      await fillAndSubmit(email, password);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Adresse e-mail ou mot de passe incorrect.',
      );
    },
  );

  it('signale un lien de confirmation expiré', async () => {
    renderRoute('/login?error=TOKEN_EXPIRED');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce lien de confirmation est invalide ou a expiré.',
    );
  });

  it('envoie directement vers les notes un utilisateur déjà connecté', async () => {
    signInAsDemo();
    const { router } = renderRoute('/login');

    await expect.poll(() => router.state.location.pathname, NAVIGATION).toBe('/notes');
  });

  it('propose de renvoyer l’e-mail de confirmation si l’adresse n’est pas vérifiée', async () => {
    renderRoute('/login');

    const user = await fillAndSubmit(UNVERIFIED_USER.email, UNVERIFIED_USER.password);
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmez d’abord votre adresse');

    await user.click(screen.getByRole('button', { name: /Renvoyer l.e-mail de confirmation/ }));
    expect(await screen.findByText('E-mail de confirmation envoyé.')).toBeInTheDocument();
  });

  it('signale un compte suspendu, seulement avec le bon mot de passe (BE-010)', async () => {
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) other.banned = true;
    renderRoute('/login');

    await fillAndSubmit(OTHER_USER.email, OTHER_USER.password);

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce compte est suspendu.');
  });

  it('ignore une redirection vers un autre site', async () => {
    const { router } = renderRoute('/login?redirect=%2F%2Fevil.example.com');

    await fillAndSubmit(DEMO_USER.email, DEMO_USER.password);

    await expect.poll(() => router.state.location.pathname, NAVIGATION).toBe('/notes');
  });

  it('n’affiche jamais les notes du compte précédent après une session expirée', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    const { router } = renderRoute('/notes');
    expect(await screen.findByText('Lire les ADR du frontend')).toBeInTheDocument();

    // La session de Demo est révoquée côté API : la prochaine requête reçoit un 401.
    db.sessionUserId = null;
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une note' }), 'a');
    await expect.poll(() => router.state.location.pathname, NAVIGATION).toBe('/login');

    // Un autre utilisateur se connecte dans le même onglet.
    await fillAndSubmit(OTHER_USER.email, OTHER_USER.password);
    await expect.poll(() => router.state.location.pathname, NAVIGATION).toBe('/notes');

    // Retour sur /notes sans recherche : la liste de Demo y était en cache.
    await user.click(screen.getByRole('link', { name: /^Notes$/ }));
    expect(await screen.findByText('Aucune note pour le moment.')).toBeInTheDocument();
    expect(screen.queryByText('Lire les ADR du frontend')).not.toBeInTheDocument();
  });

  it('valide les champs avant l’envoi', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.click(await screen.findByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Adresse e-mail invalide.')).toBeInTheDocument();
  });
});
