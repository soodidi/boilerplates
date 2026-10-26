import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';

describe('NotesPage', () => {
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

    expect(await screen.findByText('Brancher la vraie API')).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Liste des notes' })).toBeInTheDocument();
    await expect.poll(() => router.state.location.search).toEqual({ q: 'api' });
    expect(screen.queryByText('Lire les ADR du frontend')).not.toBeInTheDocument();
  });

  it('lit la recherche depuis l’URL au chargement', async () => {
    renderRoute('/notes?q=inexistant');

    expect(
      await screen.findByText('Aucune note ne correspond à « inexistant ».'),
    ).toBeInTheDocument();
  });
});
