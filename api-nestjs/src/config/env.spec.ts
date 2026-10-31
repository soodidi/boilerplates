import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgres://app:app@localhost:5432/app',
  MAIL_FROM: 'App <noreply@example.com>',
  BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  WEB_URL: 'http://localhost:5173',
};

describe('loadEnv', () => {
  it.each(['smtp://localhost:1025', 'smtp://mailpit:1025'])(
    'accepte SMTP_INSECURE vers un Mailpit local (%s)',
    (SMTP_URL) => {
      expect(loadEnv({ ...base, SMTP_URL, SMTP_INSECURE: 'true' }).SMTP_INSECURE).toBe(true);
    },
  );

  it.each([
    ['un serveur distant', 'smtp://smtp.tem.scaleway.com:587'],
    ['des identifiants', 'smtp://project:secret@localhost:1025'],
  ])('refuse SMTP_INSECURE vers %s', (_label, SMTP_URL) => {
    expect(() => loadEnv({ ...base, SMTP_URL, SMTP_INSECURE: 'true' })).toThrow(/SMTP_INSECURE/);
  });

  describe('ADMIN_EMAILS (BE-010)', () => {
    const smtp = { SMTP_URL: 'smtp://localhost:1025' };

    it('est vide par défaut', () => {
      expect(loadEnv({ ...base, ...smtp }).ADMIN_EMAILS).toEqual([]);
    });

    it('normalise les adresses et retire les doublons', () => {
      const env = loadEnv({
        ...base,
        ...smtp,
        ADMIN_EMAILS: ' Grace@Example.com, ada@example.com,,grace@example.com ',
      });
      expect(env.ADMIN_EMAILS).toEqual(['grace@example.com', 'ada@example.com']);
    });

    it('refuse une entrée qui n’est pas une adresse', () => {
      expect(() => loadEnv({ ...base, ...smtp, ADMIN_EMAILS: 'grace@example.com, admin' })).toThrow(
        /ADMIN_EMAILS/,
      );
    });

    it('refuse plus de 5 adresses', () => {
      const ADMIN_EMAILS = Array.from({ length: 6 }, (_, i) => `admin${i}@example.com`).join(',');
      expect(() => loadEnv({ ...base, ...smtp, ADMIN_EMAILS })).toThrow(/ADMIN_EMAILS/);
    });
  });

  it('refuse un secret Better Auth trop court', () => {
    expect(() =>
      loadEnv({ ...base, SMTP_URL: 'smtp://localhost:1025', BETTER_AUTH_SECRET: 'short' }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});
