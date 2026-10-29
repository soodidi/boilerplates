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
export { authKeys, sessionQueryOptions, useDeleteAccount } from './api/auth-api';
export { deleteAccountErrorMessage } from './api/auth-errors';
export { configureAuthClient } from './api/auth-client';
export { redirectIfSignedIn, requirePermission, requireSession } from './guard';
export { type Permissions, useCan } from './api/permissions-api';
export {
  type AdminUser,
  adminUsersQueryOptions,
  ROLES,
  type Role,
  useAdminUserAction,
} from './api/admin-users-api';
export { createUnauthorizedHandler } from './session-expiry';
export { redirectSearchSchema, resetPasswordSearchSchema } from './schemas/auth';
