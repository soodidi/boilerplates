import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signInAsDemo } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

// BE-010 : écrans d'erreur communs à toutes les pages.
describe('Error screens', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche « Connexion impossible » quand l’API ne répond pas, avec « Réessayer »', async () => {
    signInAsDemo();
    server.use(http.get('*/v1/notes/:id', () => HttpResponse.error()));
    renderRoute('/notes/019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f');

    expect(await screen.findByRole('heading', { name: 'Connexion impossible' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  });

  it('affiche « Accès refusé » quand l’API répond 403 dans une page', async () => {
    signInAsDemo();
    server.use(
      http.get('*/v1/notes/:id', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Forbidden', status: 403 },
          { status: 403 },
        ),
      ),
    );
    renderRoute('/notes/019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f');

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeVisible();
  });

  it('signale l’absence de réseau dès l’ouverture', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderRoute('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Vous êtes hors ligne');
  });

  it('signale la perte du réseau, puis son retour', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderRoute('/');
    await screen.findByRole('heading', { level: 1, name: 'Bienvenue' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Vous êtes hors ligne');

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
