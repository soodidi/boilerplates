import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { authKeys, resetUserCache } from './auth-api';

const session = { user: { id: 'u1', email: 'a@example.com', name: 'A' } };

function clientWithUserData() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(authKeys.session, session);
  queryClient.setQueryData(['notes', 'list', { q: '' }], { data: ['secret'] });
  return queryClient;
}

describe('resetUserCache', () => {
  it('supprime les données du compte précédent et garde la session à jour', async () => {
    const queryClient = clientWithUserData();

    await resetUserCache(queryClient, null);

    expect(queryClient.getQueryData(['notes', 'list', { q: '' }])).toBeUndefined();
    expect(queryClient.getQueryData(authKeys.session)).toBeNull();
  });

  it('à la connexion, supprime aussi les données et marque la session à relire', async () => {
    const queryClient = clientWithUserData();

    await resetUserCache(queryClient, undefined);

    expect(queryClient.getQueryData(['notes', 'list', { q: '' }])).toBeUndefined();
    expect(queryClient.getQueryState(authKeys.session)?.isInvalidated).toBe(true);
  });
});
