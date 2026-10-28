import { expect, type Page, test } from '@playwright/test';
import { signInAndOpen } from './helpers';

// FE-008 : chaque écran est utilisable de 320 px au grand écran, sans défilement horizontal.
const WIDTHS = [320, 768, 1280];

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password?token=t',
  '/legal/notice',
  '/legal/privacy',
  '/legal/terms',
  '/page-inexistante',
];

async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    // Éléments qui dépassent à droite : aide au diagnostic quand le test échoue.
    const culprits = [...document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
    return { scroll: root.scrollWidth, client: root.clientWidth, culprits };
  });
  expect(overflow.scroll, `${label} déborde : ${overflow.culprits.join(', ')}`).toBeLessThanOrEqual(
    overflow.client,
  );
}

// Les largeurs sont fixées ici : le projet mobile n'apporte rien de plus.
test.skip(({ isMobile }) => isMobile, 'largeurs testées sur le projet chromium');

for (const width of WIDTHS) {
  test(`aucune page publique ne défile horizontalement à ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page, `${path} à ${width} px`);
    }
  });

  test(`la page Notes ne défile pas horizontalement à ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await signInAndOpen(page);
    await expect(page.getByRole('list', { name: 'Liste des notes' })).toBeVisible();
    await expectNoHorizontalScroll(page, `/notes à ${width} px`);
  });
}

test('les champs font au moins 16 px sur mobile (sinon iOS zoome à la saisie)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/signup');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const sizes = await page
    .locator('input, textarea')
    .evaluateAll((fields) => fields.map((field) => parseFloat(getComputedStyle(field).fontSize)));

  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
});
