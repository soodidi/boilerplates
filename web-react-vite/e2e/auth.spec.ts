import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signInAndOpen } from './helpers';

// FE-007 / BE-006 : parcours d'authentification complet (API mockée par MSW).
test('inscription, connexion, note privée, déconnexion', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('textbox', { name: 'Nom' }).fill('Ada');
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill('ada@example.com');
  await page.getByLabel(/^Mot de passe/).fill('a long enough password');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible();

  // Les mocks confirment l'adresse tout de suite ; avec la vraie API, c'est le lien de l'e-mail.
  await page.getByRole('link', { name: 'Retour à la connexion' }).click();
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill('ada@example.com');
  await page.getByLabel('Mot de passe').fill('a long enough password');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/notes(\?.*)?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('link', { name: 'Connexion' })).toBeVisible();

  await page.getByRole('link', { name: 'Notes', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

test('une page privée renvoie vers la connexion', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('les pages d’authentification respectent WCAG 2.2 AA', async ({ page }) => {
  for (const path of ['/login', '/signup', '/forgot-password', '/reset-password?token=t']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test('le compte de démonstration ouvre les notes', async ({ page }) => {
  await signInAndOpen(page);
  await expect(page.getByRole('list', { name: 'Liste des notes' })).toBeVisible();
});
