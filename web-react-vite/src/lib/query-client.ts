import { QueryClient } from '@tanstack/react-query';
import { ForbiddenError } from './errors';

function isClientError(error: unknown): boolean {
  if (error instanceof ForbiddenError) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

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
