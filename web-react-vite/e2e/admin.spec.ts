import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { OTHER, signInAndOpen } from './helpers';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// BE-010 : rôles et permissions (API mockée par MSW, mêmes règles que l'API).
test('un administrateur suspend un compte, qui ne peut plus se connecter', async ({ page }) => {
  await signInAndOpen(page, '/notes');
  await page.getByRole('link', { name: 'Administration' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Administration' })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: 'Suspendre Other' }).click();
  await expect(page.getByRole('button', { name: 'Réactiver Other' })).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.getByRole('link', { name: 'Connexion' }).click();
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(OTHER.email);
  await page.getByLabel('Mot de passe').fill(OTHER.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ce compte est suspendu.');
});

test('un compte ordinaire voit « Accès refusé » sur l’administration', async ({ page }) => {
  await signInAndOpen(page, '/notes', OTHER);
  await expect(page.getByRole('link', { name: 'Administration' })).toHaveCount(0);

  // Navigation dans l'app : les mocks gardent la session en mémoire (pas de rechargement).
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});

test('une note inconnue affiche « Note introuvable »', async ({ page }) => {
  await signInAndOpen(page, '/notes/019a1f3e-7b2c-7d4e-9f10-000000000000');
  await expect(page.getByRole('heading', { name: 'Note introuvable' })).toBeVisible();
  await page.getByRole('link', { name: 'Toutes les notes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
});
