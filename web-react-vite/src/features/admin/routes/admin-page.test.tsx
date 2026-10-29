import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { db, OTHER_USER, signInAsDemo, signInAsUser } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

// BE-010 : page réservée. L'API (mockée par MSW) applique les mêmes permissions.
describe('AdminPage', () => {
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

  it('nomme un administrateur après confirmation, puis lui retire ce rôle', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Nommer administrateur ${OTHER_USER.name}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.role).toBe('user');

    await user.click(
      screen.getByRole('button', { name: `Nommer administrateur ${OTHER_USER.name}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    const demote = await screen.findByRole('button', {
      name: `Retirer le rôle administrateur ${OTHER_USER.name}`,
    });
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.role).toBe('admin');

    // Retirer le rôle ne se confirme pas : l'effet est sans risque.
    await user.click(demote);
    expect(
      await screen.findByRole('button', { name: `Nommer administrateur ${OTHER_USER.name}` }),
    ).toBeVisible();
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
      http.post('*/v1/auth/admin/set-role', () =>
        HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Nommer administrateur ${OTHER_USER.name}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Votre compte n'a plus le droit de faire cette action.",
    );
  });

  it('renvoie vers la connexion quand la session expire pendant une action (401)', async () => {
    signInAsDemo();
    server.use(
      http.post('*/v1/auth/admin/set-role', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Nommer administrateur ${OTHER_USER.name}` }),
    );
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
