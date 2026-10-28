import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';

describe('Pages légales', () => {
  it.each([
    ['Mentions légales', 'Mentions légales'],
    ['Politique de confidentialité', 'Politique de confidentialité'],
    ["Conditions d'utilisation", "Conditions d'utilisation"],
  ])('ouvre « %s » depuis le pied de page', async (link, heading) => {
    const user = userEvent.setup();
    renderRoute('/');

    const footer = await screen.findByRole('navigation', { name: 'Informations légales' });
    await user.click(within(footer).getByRole('link', { name: link }));

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(screen.getByText(/^Dernière mise à jour : /)).toBeVisible();
  });

  it('nomme l’hébergeur dans les mentions légales', async () => {
    renderRoute('/legal/notice');

    expect(await screen.findByRole('heading', { name: 'Hébergeur' })).toBeVisible();
    expect(screen.getByText('Scaleway SAS')).toBeVisible();
  });

  it('liste les sous-traitants, la rétention des sauvegardes et les droits', async () => {
    renderRoute('/legal/privacy');

    const processors = await screen.findByRole('region', {
      name: 'Destinataires et sous-traitants',
    });
    const processorList = within(processors).getByRole('list');
    expect(
      within(processorList)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/^Scaleway SAS/),
      expect.stringMatching(/^Sentry/),
      expect.stringMatching(/^Apple et Google/),
    ]);
    expect(screen.getByText(/sauvegardes de la base de données : 14 jours/)).toBeVisible();
    expect(screen.getByText(/exporter toutes vos données/)).toBeVisible();
    expect(screen.getByText(/supprimer votre compte et toutes vos données/)).toBeVisible();
  });
});
