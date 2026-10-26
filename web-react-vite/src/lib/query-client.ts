import { QueryClient } from '@tanstack/react-query';
import { isProblemDetailsError } from './problem-details';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Une erreur 4xx ne se corrige pas en réessayant.
        retry: (failureCount, error) =>
          !(isProblemDetailsError(error) && error.isClientError) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
