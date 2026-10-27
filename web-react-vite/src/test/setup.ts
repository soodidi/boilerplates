import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { configureAuthClient } from '@/features/auth';
import { configureHttp } from '@/lib/http';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/server';

// jsdom n'implémente pas scrollTo (utilisé par la restauration du scroll du router).
window.scrollTo = () => undefined;

// fetch côté Node exige une URL absolue.
configureHttp({ baseUrl: 'http://localhost:3000' });
configureAuthClient({ baseUrl: 'http://localhost:3000' });

// FE-007 : on mocke la frontière réseau avec MSW. Une requête non prévue fait échouer le test.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
});

afterAll(() => {
  server.close();
});
