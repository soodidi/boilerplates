import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db, OTHER_USER, signInAsDemo, signInAsUser } from '@/mocks/db';
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

  it('suspend un compte puis le réactive', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }));

    expect(
      await screen.findByRole('button', { name: `Réactiver ${OTHER_USER.name}` }),
    ).toBeVisible();
    expect(screen.getByText('Suspendu')).toBeVisible();
    expect(db.users.find((candidate) => candidate.id === OTHER_USER.id)?.banned).toBe(true);

    await user.click(screen.getByRole('button', { name: `Réactiver ${OTHER_USER.name}` }));

    expect(
      await screen.findByRole('button', { name: `Suspendre ${OTHER_USER.name}` }),
    ).toBeVisible();
  });

  it('nomme un administrateur', async () => {
    signInAsDemo();
    const user = userEvent.setup();
    renderRoute('/admin');

    await user.click(
      await screen.findByRole('button', { name: `Nommer ${OTHER_USER.name} administrateur` }),
    );

    expect(
      await screen.findByRole('button', {
        name: `Retirer le rôle administrateur à ${OTHER_USER.name}`,
      }),
    ).toBeVisible();
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
