import { QueryClient } from '@tanstack/react-query';
import { isClientError } from './errors';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Une erreur 4xx (Problem Details ou Better Auth) ou un refus ne se corrige pas en réessayant.
        retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
