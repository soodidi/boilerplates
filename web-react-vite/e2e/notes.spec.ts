import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// FE-007 : parcours critique. FE-008 : aucune violation d'accessibilité WCAG 2.2 AA détectée.
test('créer une note et la retrouver dans la liste', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Titre' }).fill('Note créée en E2E');
  await page.getByRole('button', { name: 'Ajouter la note' }).click();

  await expect(page.getByRole('status')).toHaveText('Note ajoutée.');
  await expect(page.getByRole('list', { name: 'Liste des notes' })).toContainText(
    'Note créée en E2E',
  );
});

test('la page Notes respecte WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/notes');
  await expect(page.getByRole('list', { name: 'Liste des notes' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('navigation au clavier : le lien d’évitement mène au contenu', async ({ page }) => {
  await page.goto('/');
  // The app renders after an async bootstrap (config + MSW): wait for it before pressing Tab.
  await expect(page.getByRole('main')).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
});
