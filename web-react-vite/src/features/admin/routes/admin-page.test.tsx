import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { db, OTHER_USER, signInAsDemo, signInAsUser } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

// BE-010 : page réservée. L'API (mockée par MSW) applique les mêmes permissions.
describe('AdminPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('montre les chiffres et les comptes à un administrateur', async () => {
    signInAsDemo();
    renderRoute('/admin');

    await screen.findByRole('heading', { level: 1, name: 'Administration' });
    const stats = screen.getByRole('region', { name: 'En chiffres' });
    expect(
      within(stats)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Comptes', 'Notes']);
    expect(
      within(stats)
        .getAllByRole('definition')
        .map((value) => value.textContent),
    ).toEqual(['3', '2']);

    const accounts = screen.getByRole('region', { name: 'Comptes' });
    expect(within(accounts).getByText(OTHER_USER.email)).toBeVisible();
    // Aucune action sur son propre compte.
    expect(within(accounts).getByText('(vous)')).toBeVisible();
    expect(within(accounts).queryByRole('button', { name: /Demo/ })).not.toBeInTheDocument();
  });

  it('suspend un compte après confirmation, puis le réactive', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }));
    // Rien n'est envoyé avant la confirmation, qui reçoit le focus.
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.banned).toBe(false);
    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(
      await screen.findByRole('button', { name: `Réactiver ${OTHER_USER.name}` }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Modification enregistrée.');
    expect(screen.getByText('Suspendu')).toBeVisible();
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.banned).toBe(true);

    await user.click(screen.getByRole('button', { name: `Réactiver ${OTHER_USER.name}` }));

    expect(
      await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }),
    ).toBeVisible();
  });

  it('rend le focus au bouton « Suspendre » après « Annuler », sans rien envoyer', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('button', { name: `Suspendre ${OTHER_USER.name}` })).toHaveFocus();
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.banned).toBe(false);
  });

  it('n’offre aucune action sur un autre administrateur (défini par la configuration)', async () => {
    signInAsDemo();
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) other.role = 'admin';
    renderRoute('/admin');

    const accounts = await screen.findByRole('region', { name: 'Comptes' });
    expect(
      await within(accounts).findByText('Administrateur défini par la configuration du serveur.'),
    ).toBeVisible();
    expect(
      within(accounts).queryByRole('button', { name: new RegExp(OTHER_USER.name) }),
    ).not.toBeInTheDocument();
  });

  it('permet de réactiver un administrateur suspendu avant d’être nommé', async () => {
    signInAsDemo();
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) Object.assign(other, { role: 'admin', banned: true });
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Réactiver ${OTHER_USER.name}` }));

    await expect.poll(() => other?.banned).toBe(false);
    expect(
      screen.queryByRole('button', { name: `Suspendre ${OTHER_USER.name}` }),
    ).not.toBeInTheDocument();
  });

  it('n’offre ni export ni suppression sur un compte non suspendu', async () => {
    signInAsDemo();
    renderRoute('/admin');

    await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` });
    expect(
      screen.queryByRole('button', { name: `Exporter ses données ${OTHER_USER.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `Supprimer le compte ${OTHER_USER.name}` }),
    ).not.toBeInTheDocument();
  });

  it('exporte les données d’un compte suspendu (GLB-013)', async () => {
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
    signInAsDemo();
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) other.banned = true;
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Exporter ses données ${OTHER_USER.name}` }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Fichier téléchargé.');
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(
      new RegExp(`^export-${OTHER_USER.id}-\\d{4}-\\d{2}-\\d{2}\\.json$`),
    );
  });

  it('supprime un compte suspendu après confirmation (GLB-013)', async () => {
    signInAsDemo();
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) other.banned = true;
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Supprimer le compte ${OTHER_USER.name}` }),
    );
    expect(screen.getByText(/C'est définitif/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    // Le focus revient sur le bouton qui a ouvert la confirmation ; rien n'est supprimé.
    expect(
      screen.getByRole('button', { name: `Supprimer le compte ${OTHER_USER.name}` }),
    ).toHaveFocus();
    expect(db.users.some((candidate) => candidate.id === OTHER_USER.id)).toBe(true);

    await user.click(
      screen.getByRole('button', { name: `Supprimer le compte ${OTHER_USER.name}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      `Le compte de ${OTHER_USER.name} et ses données ont été supprimés.`,
    );
    const accounts = screen.getByRole('region', { name: 'Comptes' });
    await expect.poll(() => within(accounts).queryByText(OTHER_USER.email)).toBeNull();
  });

  it('signale l’échec d’une action', async () => {
    signInAsDemo();
    server.use(
      http.post('*/v1/auth/admin/unban-user', () =>
        HttpResponse.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    );
    const other = db.users.find((candidate) => candidate.id === OTHER_USER.id);
    if (other) other.banned = true;
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Réactiver ${OTHER_USER.name}` }));

    expect(await screen.findByRole('alert')).toHaveTextContent("L'action a échoué. Réessayez.");
  });

  it('signale un droit retiré pendant la session (403 de l’API sur une action)', async () => {
    signInAsDemo();
    server.use(
      http.post('*/v1/auth/admin/ban-user', () =>
        HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Votre compte n'a plus le droit de faire cette action.",
    );
  });

  it('renvoie vers la connexion quand la session expire pendant une action (401)', async () => {
    signInAsDemo();
    server.use(
      http.post('*/v1/auth/admin/ban-user', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await expect.poll(() => router.state.location.pathname).toBe('/login');
  });

  it('affiche « Accès refusé » si l’API refuse la liste des comptes (403)', async () => {
    signInAsDemo();
    server.use(
      http.get('*/v1/auth/admin/list-users', () =>
        HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 }),
      ),
    );
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeVisible();
  });

  it('affiche « Connexion impossible » si l’API ne répond pas', async () => {
    signInAsDemo();
    server.use(http.get('*/v1/auth/admin/list-users', () => HttpResponse.error()));
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Connexion impossible' })).toBeVisible();
  });

  it('renvoie vers la connexion si la session est révoquée côté API (401 de has-permission)', async () => {
    signInAsDemo();
    server.use(
      http.post('*/v1/auth/admin/has-permission', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    );
    const { router } = renderRoute('/admin');

    await expect.poll(() => router.state.location.pathname).toBe('/login');
  });

  it('affiche « Accès refusé » à un compte sans la permission, sans lien dans l’en-tête', async () => {
    signInAsUser();
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeVisible();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('montre le lien « Administration » à un administrateur', async () => {
    signInAsDemo();
    renderRoute('/notes');

    expect(await screen.findByRole('link', { name: 'Administration' })).toBeVisible();
  });

  it('renvoie vers la connexion sans session', async () => {
    const { router } = renderRoute('/admin');

    await screen.findByRole('heading', { name: 'Connexion' });
    expect(router.state.location.pathname).toBe('/login');
  });
});
