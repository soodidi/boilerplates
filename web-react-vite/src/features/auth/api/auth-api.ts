import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from './auth-client';
import { type Session, type SignInInput, type SignUpInput, sessionSchema } from '../schemas/auth';

/** Erreur renvoyée par Better Auth (`{ error: { status, code } }`). */
export class AuthError extends Error {
  override readonly name = 'AuthError';

  constructor(
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(code ?? `HTTP ${status}`);
  }
}

type AuthResult<T> = { data: T | null; error: { status: number; code?: string } | null };

function unwrap<T>(result: AuthResult<T>): T | null {
  if (result.error) throw new AuthError(result.error.status, result.error.code);
  return result.data;
}

/** Lien absolu vers une page du front, pour les e-mails envoyés par l'API. */
function appUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

export const authKeys = {
  session: ['auth', 'session'] as const,
};

/**
 * Session de l'utilisateur, ou `null`. Relue au chargement de l'app : c'est aussi ce qui
 * prolonge le cookie de session (BE-006, sessions renouvelées à l'usage).
 */
export function sessionQueryOptions() {
  return queryOptions({
    queryKey: authKeys.session,
    queryFn: async (): Promise<Session> =>
      sessionSchema.parse((await authClient().getSession()).data ?? null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignInInput) => unwrap(await authClient().signIn.email(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.session }),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: SignUpInput) =>
      // Après le clic sur le lien de vérification, l'API connecte l'utilisateur et le renvoie ici.
      unwrap(await authClient().signUp.email({ ...input, callbackURL: appUrl('/notes') })),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email: string) =>
      unwrap(await authClient().sendVerificationEmail({ email, callbackURL: appUrl('/notes') })),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) =>
      unwrap(
        await authClient().requestPasswordReset({ email, redirectTo: appUrl('/reset-password') }),
      ),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; newPassword: string }) =>
      unwrap(await authClient().resetPassword(input)),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await authClient().signOut()),
    // Plus aucune donnée d'utilisateur ne reste en cache après la déconnexion.
    onSettled: () => {
      queryClient.clear();
    },
  });
}
