import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEMO, signInAndOpen } from './helpers';

// GLB-013 : export des données et suppression du compte (API mockée par MSW).
test('« Mon compte » exporte les données puis supprime le compte', async ({ page }) => {
  await signInAndOpen(page, '/notes');
  await page.getByRole('link', { name: 'Mon compte' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger mes données' }).click();
  expect((await download).suggestedFilename()).toMatch(/^export-\d{4}-\d{2}-\d{2}\.json$/);

  const deletion = page.getByRole('region', { name: 'Supprimer mon compte' });
  await deletion.getByLabel('Mot de passe actuel').fill('not the password');
  await deletion.getByRole('checkbox').check();
  await deletion.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await expect(deletion.getByRole('alert')).toHaveText('Mot de passe incorrect.');

  await deletion.getByLabel('Mot de passe actuel').fill(DEMO.password);
  await deletion.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status')).toHaveText(
    'Votre compte et vos données ont été supprimés.',
  );

  // Le compte n'existe plus : la connexion échoue.
  await page.getByRole('link', { name: 'Connexion' }).click();
  await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(DEMO.email);
  await page.getByLabel('Mot de passe').fill(DEMO.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toHaveText('Adresse e-mail ou mot de passe incorrect.');
});
