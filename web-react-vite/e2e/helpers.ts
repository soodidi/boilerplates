import { expect, type Page } from '@playwright/test';

/** Compte de démonstration des mocks MSW (src/mocks/db.ts). */
export const DEMO = { email: 'demo@example.com', password: 'demo-password-123' };

/**
 * Connexion par le formulaire, puis ouverture de `path` par la navigation de l'app.
 * Les mocks MSW gardent la session en mémoire : un rechargement de page la perd.
 */
export async function signInAndOpen(page: Page, path = '/notes') {
  await page.goto(`/login?redirect=${encodeURIComponent(path)}`);
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(DEMO.email);
  await page.getByLabel('Mot de passe').fill(DEMO.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(new RegExp(`${path}(\\?.*)?$`));
}
