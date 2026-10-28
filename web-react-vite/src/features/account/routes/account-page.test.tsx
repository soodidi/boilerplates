import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, DEMO_USER, signInAsDemo } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

describe('AccountPage', () => {
  beforeEach(() => {
    signInAsDemo();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function openAccount() {
    const user = userEvent.setup();
    const view = renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Mon compte' });
    const deletion = screen.getByRole('region', { name: 'Supprimer mon compte' });
    return { user, deletion, ...view };
  }

  it('montre le compte connecté et le lien vers la politique de confidentialité', async () => {
    await openAccount();

    expect(screen.getByText(`Connecté avec ${DEMO_USER.email}`)).toBeVisible();
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Politique de confidentialité' }),
    ).toHaveAttribute('href', '/legal/privacy');
  });

  it('télécharge l’export des données en JSON', async () => {
    // jsdom ne sait ni créer d'URL de Blob ni télécharger : on observe le lien créé.
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:export');
        static override revokeObjectURL = vi.fn();
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { user } = await openAccount();

    await user.click(screen.getByRole('button', { name: 'Télécharger mes données' }));

    expect(await screen.findByText('Fichier téléchargé.')).toBeVisible();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^export-\d{4}-\d{2}-\d{2}\.json$/);
    expect(link.href).toBe('blob:export');
  });

  it('exige la confirmation avant de supprimer', async () => {
    const { user, deletion } = await openAccount();

    await user.type(within(deletion).getByLabelText('Mot de passe actuel'), DEMO_USER.password);
    await user.click(within(deletion).getByRole('button', { name: 'Supprimer mon compte' }));

    expect(await within(deletion).findByText('Cochez cette case pour confirmer.')).toBeVisible();
    expect(db.users.map((candidate) => candidate.id)).toContain(DEMO_USER.id);
  });

  it('refuse un mauvais mot de passe sans rien supprimer', async () => {
    const { user, deletion } = await openAccount();

    await user.type(within(deletion).getByLabelText('Mot de passe actuel'), 'not the password');
    await user.click(within(deletion).getByRole('checkbox'));
    await user.click(within(deletion).getByRole('button', { name: 'Supprimer mon compte' }));

    expect(await within(deletion).findByRole('alert')).toHaveTextContent('Mot de passe incorrect.');
    expect(db.users.map((candidate) => candidate.id)).toContain(DEMO_USER.id);
  });

  it('supprime le compte, vide la session et revient à l’accueil', async () => {
    const { user, deletion, router } = await openAccount();

    await user.type(within(deletion).getByLabelText('Mot de passe actuel'), DEMO_USER.password);
    await user.click(within(deletion).getByRole('checkbox'));
    await user.click(within(deletion).getByRole('button', { name: 'Supprimer mon compte' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Votre compte et vos données ont été supprimés.',
    );
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('link', { name: 'Connexion' })).toBeVisible();
    expect(db.users.map((candidate) => candidate.id)).not.toContain(DEMO_USER.id);
    expect(db.notes.filter((note) => note.ownerId === DEMO_USER.id)).toEqual([]);
  });

  it("affiche une erreur si l'export échoue, sans rien télécharger", async () => {
    server.use(
      http.get('*/v1/account/export', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Internal Server Error', status: 500 },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { user } = await openAccount();

    await user.click(screen.getByRole('button', { name: 'Télécharger mes données' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'export n'a pas pu être préparé. Réessayez.",
    );
    expect(screen.queryByText('Fichier téléchargé.')).not.toBeInTheDocument();
    expect(click).not.toHaveBeenCalled();
  });

  it.each([
    // Limite de Better Auth (5 essais par minute) : 429, sans `code`.
    [
      'trop d’essais',
      HttpResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 }),
      'Trop de tentatives. Réessayez dans quelques minutes.',
    ],
    // Effacement des données des modules en échec : l'API garde le compte et répond 500.
    [
      'une erreur serveur',
      HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      'Une erreur est survenue. Réessayez.',
    ],
  ])('affiche un message dédié pour %s et reste sur la page', async (_case, response, message) => {
    server.use(http.post('*/v1/auth/delete-user', () => response));
    const { user, deletion, router } = await openAccount();

    await user.type(within(deletion).getByLabelText('Mot de passe actuel'), DEMO_USER.password);
    await user.click(within(deletion).getByRole('checkbox'));
    await user.click(within(deletion).getByRole('button', { name: 'Supprimer mon compte' }));

    expect(await within(deletion).findByRole('alert')).toHaveTextContent(message);
    expect(router.state.location.pathname).toBe('/account');
    expect(screen.getByRole('link', { name: 'Mon compte' })).toBeVisible();
  });

  it('exige le mot de passe avant de supprimer', async () => {
    const { user, deletion } = await openAccount();

    await user.click(within(deletion).getByRole('checkbox'));
    await user.click(within(deletion).getByRole('button', { name: 'Supprimer mon compte' }));

    expect(within(deletion).getByLabelText('Mot de passe actuel')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(db.users.map((candidate) => candidate.id)).toContain(DEMO_USER.id);
  });

  it('renvoie vers la connexion sans session', async () => {
    db.sessionUserId = null;
    renderRoute('/account');

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeVisible();
  });
});
