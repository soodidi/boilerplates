import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// GLB-013 : pages légales accessibles depuis le pied de page, conformes WCAG 2.2 AA.
test('les pages légales s’ouvrent depuis le pied de page et respectent WCAG 2.2 AA', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('navigation', { name: 'Informations légales' });

  for (const name of [
    'Mentions légales',
    'Politique de confidentialité',
    "Conditions d'utilisation",
  ]) {
    await footer.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

// FE-008 : liens du pied de page utilisables au clavier, contrastes valides en mode sombre.
test('le pied de page s’utilise au clavier et la page reste conforme en mode sombre', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const link = page
    .getByRole('navigation', { name: 'Informations légales' })
    .getByRole('link', { name: 'Politique de confidentialité' });

  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/legal\/privacy$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('une page légale s’ouvre directement par son URL', async ({ page }) => {
  await page.goto('/legal/terms');

  await expect(
    page.getByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
  ).toBeVisible();
});
