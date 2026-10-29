import { expect, type Page } from '@playwright/test';

/** Compte de démonstration des mocks MSW (src/mocks/db.ts), administrateur. */
export const DEMO = { email: 'demo@example.com', password: 'demo-password-123' };

/** Compte ordinaire des mocks (rôle `user`). */
export const OTHER = { email: 'other@example.com', password: 'other-password-123' };

/**
 * Connexion par le formulaire, puis ouverture de `path` par la navigation de l'app.
 * Les mocks MSW gardent la session en mémoire : un rechargement de page la perd.
 */
export async function signInAndOpen(page: Page, path = '/notes', account = DEMO) {
  await page.goto(`/login?redirect=${encodeURIComponent(path)}`);
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(account.email);
  await page.getByLabel('Mot de passe').fill(account.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(new RegExp(`${path}(\\?.*)?$`));
}
