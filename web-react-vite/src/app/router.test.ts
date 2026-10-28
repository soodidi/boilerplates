import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { PRIVATE_PAGES, PUBLIC_PAGES } from '../../e2e/pages';
import { createAppRouter } from './router';

describe('router', () => {
  it('chaque route est ouverte par le test E2E responsive (FE-008)', () => {
    const router = createAppRouter({ queryClient: new QueryClient() });
    const routes = Object.keys(router.routesByPath).toSorted();
    const tested = Object.keys({ ...PUBLIC_PAGES, ...PRIVATE_PAGES }).toSorted();

    // Une route ajoutée au router doit l'être aussi dans e2e/pages.ts.
    expect(tested).toEqual(routes);
  });
});
