import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { signInAsDemo } from '@/mocks/db';
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

  it.each([
    ['publique', '/login', 'Connexion'],
    ['introuvable', '/page-inexistante', 'Page introuvable'],
    ['légale', '/legal/terms', "Conditions d'utilisation"],
  ])('affiche le pied de page sur une page %s', async (_kind, url, heading) => {
    renderRoute(url);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible();
    const footer = screen.getByRole('navigation', { name: 'Informations légales' });
    expect(
      within(footer)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/legal/notice', '/legal/privacy', '/legal/terms']);
  });

  it('affiche le pied de page sur une page privée', async () => {
    signInAsDemo();
    renderRoute('/notes');

    expect(await screen.findByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Informations légales' })).toBeVisible();
  });

  it('donne les coordonnées de l’hébergeur et les champs à compléter de l’éditeur', async () => {
    renderRoute('/legal/notice');

    const host = await screen.findByRole('region', { name: 'Hébergeur' });
    expect(host).toHaveTextContent("8, rue de la Ville-l'Évêque, 75008 Paris, France");
    expect(host).toHaveTextContent('+33 (0)1 84 13 00 00');
    const publisher = screen.getByRole('region', { name: 'Éditeur' });
    expect(publisher).toHaveTextContent("[NOM DE L'ÉDITEUR]");
    expect(screen.getByRole('region', { name: 'Directeur de la publication' })).toHaveTextContent(
      '[NOM DU DIRECTEUR DE LA PUBLICATION]',
    );
  });

  it('annonce Sentry hébergé dans l’UE, le seul cookie de session et le recours à la CNIL', async () => {
    renderRoute('/legal/privacy');

    const processors = await screen.findByRole('region', {
      name: 'Destinataires et sous-traitants',
    });
    expect(processors).toHaveTextContent(/Sentry.*Union européenne/);
    expect(screen.getByRole('region', { name: 'Cookies' })).toHaveTextContent(
      /un seul cookie : le cookie de session.*ne demande donc pas votre consentement/,
    );
    const rights = screen.getByRole('region', { name: 'Vos droits' });
    expect(rights).toHaveTextContent('« Mon compte »');
    expect(rights).toHaveTextContent('CNIL');
    expect(screen.getByRole('region', { name: 'Finalités et bases légales' })).toHaveTextContent(
      'exécution du contrat',
    );
  });

  it('affiche les pages en anglais quand la langue est l’anglais', async () => {
    const user = userEvent.setup();
    renderRoute('/', { locale: 'en' });

    const footer = await screen.findByRole('navigation', { name: 'Legal information' });
    await user.click(within(footer).getByRole('link', { name: 'Privacy policy' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    expect(screen.getByText(/^Last updated: /)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Recipients and processors' })).toHaveTextContent(
      'Scaleway SAS',
    );
    expect(screen.queryByRole('heading', { name: 'Destinataires et sous-traitants' })).toBeNull();
  });
});
