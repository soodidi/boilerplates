import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, DEMO_USER, signInAsDemo } from '@/mocks/db';
import { renderRoute } from '@/test/render';

describe('AccountPage', () => {
  beforeEach(() => {
    signInAsDemo();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
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

  it('renvoie vers la connexion sans session', async () => {
    db.sessionUserId = null;
    renderRoute('/account');

    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeVisible();
  });
});
