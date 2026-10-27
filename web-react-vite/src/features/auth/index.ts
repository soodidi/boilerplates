import { lazyRouteComponent } from '@tanstack/react-router';

// API publique de la feature (FE-003). Le reste de l'app n'importe que ce fichier.

export const LoginPage = lazyRouteComponent(() => import('./routes/login-page'), 'LoginPage');
export const SignupPage = lazyRouteComponent(() => import('./routes/signup-page'), 'SignupPage');
export const ForgotPasswordPage = lazyRouteComponent(
  () => import('./routes/forgot-password-page'),
  'ForgotPasswordPage',
);
export const ResetPasswordPage = lazyRouteComponent(
  () => import('./routes/reset-password-page'),
  'ResetPasswordPage',
);

export { AccountMenu } from './components/account-menu';
export { authKeys, sessionQueryOptions } from './api/auth-api';
export { configureAuthClient } from './api/auth-client';
export { redirectIfSignedIn, requireSession } from './guard';
export { createUnauthorizedHandler } from './session-expiry';
export { redirectSearchSchema, resetPasswordSearchSchema } from './schemas/auth';
