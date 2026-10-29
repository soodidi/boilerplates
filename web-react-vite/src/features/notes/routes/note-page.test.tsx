import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { db, OTHER_USER, signInAsDemo } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

const DEMO_NOTE_ID = '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f';

describe('NotePage', () => {
  it('affiche une note de l’utilisateur', async () => {
    signInAsDemo();
    renderRoute(`/notes/${DEMO_NOTE_ID}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lire les ADR du frontend' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Toutes les notes' })).toBeVisible();
  });

  it('affiche « Note introuvable » pour la note d’un autre utilisateur (404 de l’API)', async () => {
    signInAsDemo();
    const id = '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e99';
    db.notes.push({
      id,
      title: 'secret',
      content: '',
      createdAt: '2026-10-22T10:00:00.000Z',
      ownerId: OTHER_USER.id,
    });
    renderRoute(`/notes/${id}`);

    expect(await screen.findByRole('heading', { name: 'Note introuvable' })).toBeVisible();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('affiche « Note introuvable » pour un identifiant impossible, sans appeler l’API', async () => {
    signInAsDemo();
    const noteRequests: string[] = [];
    const listener = ({ request }: { request: Request }) => {
      if (new URL(request.url).pathname.startsWith('/v1/notes/')) noteRequests.push(request.url);
    };
    server.events.on('request:start', listener);
    renderRoute('/notes/42');

    expect(await screen.findByRole('heading', { name: 'Note introuvable' })).toBeVisible();
    server.events.removeListener('request:start', listener);
    expect(noteRequests).toEqual([]);
  });

  it('ouvre la note depuis la liste', async () => {
    signInAsDemo();
    renderRoute('/notes');

    const link = await screen.findByRole('link', { name: 'Lire les ADR du frontend' });
    expect(link).toHaveAttribute('href', `/notes/${DEMO_NOTE_ID}`);
  });
});
