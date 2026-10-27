import { describe, expect, it } from 'vitest';
import { syncEnv as sync } from './env-file.mjs';

const example = ['# Commentaire', 'PORT=3000', 'BETTER_AUTH_SECRET=change-me', ''].join('\n');

describe('syncEnv', () => {
  it('crée le .env avec un secret généré', () => {
    const { content, added } = sync(example, null);

    expect(added).toEqual(['PORT', 'BETTER_AUTH_SECRET']);
    expect(content).toContain('PORT=3000');
    expect(content).toMatch(/^BETTER_AUTH_SECRET=[A-Za-z0-9+/]{43}=$/m);
  });

  it('génère un secret différent à chaque création', () => {
    expect(sync(example, null).content).not.toEqual(sync(example, null).content);
  });

  it('ne touche à rien quand le .env est à jour', () => {
    expect(sync(example, 'PORT=4000\nBETTER_AUTH_SECRET=mine\n')).toEqual({
      content: null,
      added: [],
    });
  });

  it('ajoute seulement les variables manquantes, sans modifier les valeurs existantes', () => {
    const { content, added } = sync(example, 'PORT=4000\n');

    expect(added).toEqual(['BETTER_AUTH_SECRET']);
    expect(content).toContain('PORT=4000');
    expect(content).not.toContain('change-me');
  });

  it("remplace un secret resté à la valeur d'exemple (publique)", () => {
    const { content } = sync(example, 'PORT=3000\nBETTER_AUTH_SECRET=change-me\n');

    expect(content).not.toContain('change-me');
    expect(content).toMatch(/^BETTER_AUTH_SECRET=[A-Za-z0-9+/]{43}=$/m);
  });
});
