import { expect, type Page, test } from '@playwright/test';
import { signInAndOpen } from './helpers';
import { NOT_FOUND_PAGE, PUBLIC_PAGES } from './pages';

// FE-008 : chaque écran est utilisable de 320 px au grand écran, sans défilement horizontal.
const WIDTHS = [320, 768, 1280];

async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    // Éléments qui dépassent à droite : aide au diagnostic quand le test échoue.
    const overflowing = [...document.querySelectorAll('body *')].filter(
      (element) => element.getBoundingClientRect().right > root.clientWidth + 1,
    );
    // Les plus profonds seulement : une grille élargie par un enfant ferait sinon remonter ses parents.
    const culprits = overflowing
      .filter(
        (element) => !overflowing.some((other) => other !== element && element.contains(other)),
      )
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`);
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
    for (const path of [...Object.values(PUBLIC_PAGES), NOT_FOUND_PAGE]) {
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

// Contenu saisi par l'utilisateur, sans espace : le texte doit passer à la ligne, pas élargir la page.
test.describe('contenu long sans espace', () => {
  // Ni tiret ni barre oblique après le domaine : le navigateur ne trouve aucun point de coupure.
  const LONG_URL = `https://exemple.fr/?q=${'abcdefghij'.repeat(9)}`;
  const LONG_EMAIL = `${'prenomnom'.repeat(7)}@sousdomainetreslong.entrepriseexemple.fr`;

  test('une note au titre et au contenu sans espace à 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await signInAndOpen(page);
    await page.getByRole('textbox', { name: 'Titre' }).fill(LONG_URL);
    await page.getByRole('textbox', { name: 'Contenu' }).fill(`${LONG_URL}${LONG_URL}`);
    await page.getByRole('button', { name: 'Ajouter la note' }).click();
    await expect(page.getByRole('list', { name: 'Liste des notes' })).toContainText(LONG_URL);
    await expectNoHorizontalScroll(page, 'note longue à 320 px');
  });

  test('une recherche sans résultat sans espace à 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await signInAndOpen(page);
    const query = 'x'.repeat(100);
    await page.getByRole('searchbox', { name: 'Rechercher une note' }).fill(query);
    await expect(page.getByText(`Aucune note ne correspond à « ${query} ».`)).toBeVisible();
    await expectNoHorizontalScroll(page, 'recherche longue à 320 px');
  });

  async function signUp(page: Page) {
    await page.goto('/signup');
    await page.getByRole('textbox', { name: 'Nom' }).fill('Ada');
    await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(LONG_EMAIL);
    await page.getByLabel(/^Mot de passe/).fill('a long enough password');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible();
  }

  test('le message « vérifiez votre boîte mail » avec un e-mail long à 320 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await signUp(page);
    await expectNoHorizontalScroll(page, 'e-mail long après inscription à 320 px');
  });

  for (const width of [768, 1280]) {
    test(`un e-mail long dans l'en-tête à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await signUp(page);
      await page.getByRole('link', { name: 'Retour à la connexion' }).click();
      await page.getByRole('textbox', { name: 'Adresse e-mail' }).fill(LONG_EMAIL);
      await page.getByLabel('Mot de passe').fill('a long enough password');
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await expect(page.getByText(LONG_EMAIL)).toBeVisible();
      await expectNoHorizontalScroll(page, `en-tête avec e-mail long à ${width} px`);
    });
  }
});
