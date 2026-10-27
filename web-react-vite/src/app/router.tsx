import { type QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import {
  ForgotPasswordPage,
  LoginPage,
  redirectSearchSchema,
  requireSession,
  ResetPasswordPage,
  resetPasswordSearchSchema,
  SignupPage,
} from '@/features/auth';
import { HomePage } from '@/features/home';
import { NotesPage, notesQueryOptions, notesSearchSchema } from '@/features/notes';
import { NotFound, RouteError } from './error-fallback';
import { RootLayout } from './root-layout';

export type RouterContext = {
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  // Page demandée avant la connexion (chemin interne uniquement).
  validateSearch: redirectSearchSchema,
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  // BE-006 : page privée. Sans session, redirection vers /login.
  beforeLoad: requireSession,
  // FE-004 : les filtres vivent dans l'URL, validés et typés par Zod.
  validateSearch: notesSearchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  // Charge les données avant l'affichage si elles ne sont pas déjà en cache.
  loader: ({ context, deps }) =>
    context.queryClient.query({ ...notesQueryOptions(deps.q), staleTime: 'static' }),
  component: NotesPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  notesRoute,
]);

type CreateAppRouterOptions = {
  queryClient: QueryClient;
  /** Historique en mémoire pour les tests. */
  history?: RouterHistory;
};

export function createAppRouter({ queryClient, history }: CreateAppRouterOptions) {
  return createRouter({
    routeTree,
    context: { queryClient },
    ...(history ? { history } : {}),
    defaultPreload: 'intent',
    // Le cache est géré par TanStack Query : le router ne garde pas ses propres données.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

// Augmentation des types du router : seule une `interface` peut être fusionnée.
declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: AppRouter;
  }
}
