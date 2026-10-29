import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { signInAsDemo } from '@/mocks/db';
import { renderRoute } from '@/test/render';

describe('NotesPage', () => {
  beforeEach(() => {
    signInAsDemo();
  });

  it('affiche les notes renvoyées par l’API', async () => {
    renderRoute('/notes');

    const list = await screen.findByRole('list', { name: 'Liste des notes' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('filtre les notes et garde la recherche dans l’URL', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/notes');
    await screen.findByRole('list', { name: 'Liste des notes' });

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une note' }), 'api');

    // La liste précédente reste affichée jusqu'à la réponse (keepPreviousData) : on attend qu'elle change.
    await waitForElementToBeRemoved(() => screen.queryByText('Lire les ADR du frontend'), {
      timeout: 3000,
    });
    expect(screen.getByText('Brancher la vraie API')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Liste des notes' })).getAllByRole('listitem'),
    ).toHaveLength(1);
    await expect.poll(() => router.state.location.search).toEqual({ q: 'api' });
  });

  it('lit la recherche depuis l’URL au chargement', async () => {
    renderRoute('/notes?q=inexistant');

    expect(
      await screen.findByText('Aucune note ne correspond à « inexistant ».'),
    ).toBeInTheDocument();
  });
});
