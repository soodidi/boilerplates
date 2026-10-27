import { z } from 'zod';
import { type Messages } from '@/i18n';

/** BE-006 : même longueur minimale que l'API (auth.config.ts). */
export const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;

/** FE-002 : la session renvoyée par l'API est validée avant d'être utilisée. */
export const sessionSchema = z
  .object({
    user: z.object({ id: z.string(), email: z.string(), name: z.string() }),
  })
  .nullable();

export type Session = z.infer<typeof sessionSchema>;

/** Redirection après connexion : chemin interne uniquement (pas d'URL vers un autre site). */
export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
});

export const resetPasswordSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

const email = (m: Messages) => z.email({ error: m.auth.validation.email }).trim().toLowerCase();

const newPassword = (m: Messages) =>
  z
    .string()
    .min(PASSWORD_MIN, { error: m.auth.validation.passwordTooShort(PASSWORD_MIN) })
    .max(PASSWORD_MAX, { error: m.validation.tooLong(PASSWORD_MAX) });

export const signInFormSchema = (m: Messages) =>
  z.object({
    email: email(m),
    password: z.string().min(1, { error: m.validation.required }),
  });

export const signUpFormSchema = (m: Messages) =>
  z.object({
    name: z.string().trim().min(1, { error: m.validation.required }).max(100),
    email: email(m),
    password: newPassword(m),
  });

export const forgotPasswordFormSchema = (m: Messages) => z.object({ email: email(m) });

export const resetPasswordFormSchema = (m: Messages) => z.object({ password: newPassword(m) });

export type SignInInput = z.infer<ReturnType<typeof signInFormSchema>>;
export type SignUpInput = z.infer<ReturnType<typeof signUpFormSchema>>;
