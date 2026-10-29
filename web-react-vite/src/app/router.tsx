import { type QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  type RouterHistory,
} from '@tanstack/react-router';
import { z } from 'zod';
import {
  ForgotPasswordPage,
  LoginPage,
  redirectIfSignedIn,
  redirectSearchSchema,
  requirePermission,
  requireSession,
  ResetPasswordPage,
  resetPasswordSearchSchema,
  SignupPage,
} from '@/features/auth';
import { AccountPage } from '@/features/account';
import { ADMIN_PAGE_PERMISSIONS, AdminPage, adminStatsQueryOptions } from '@/features/admin';
import { adminUsersQueryOptions } from '@/features/auth';
import { HomePage } from '@/features/home';
import { LegalNoticePage, PrivacyPolicyPage, TermsOfUsePage } from '@/features/legal';
import {
  NoteNotFound,
  NotePage,
  noteQueryOptions,
  NotesPage,
  notesQueryOptions,
  notesSearchSchema,
} from '@/features/notes';
import { isProblemDetailsError } from '@/lib/problem-details';
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
  // Déjà connecté (par exemple après le lien de vérification) : on va directement à destination.
  beforeLoad: redirectIfSignedIn,
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

// BE-010 : détail d'une note. Absente ou d'un autre utilisateur (404 de l'API) : « Note introuvable ».
const noteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/$id',
  beforeLoad: requireSession,
  loader: async ({ context, params }) => {
    // Un identifiant qui ne peut pas exister : inutile de demander à l'API (qui répondrait 400).
    // TanStack Router : `notFound()` est fait pour être levé dans un loader.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (!z.uuid().safeParse(params.id).success) throw notFound();
    try {
      await context.queryClient.query({ ...noteQueryOptions(params.id), staleTime: 'static' });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (isProblemDetailsError(error) && error.status === 404) throw notFound();
      throw error;
    }
  },
  notFoundComponent: NoteNotFound,
  component: NotePage,
});

// BE-010 : page réservée aux comptes qui ont les permissions de l'administration.
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: requirePermission(ADMIN_PAGE_PERMISSIONS),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(adminStatsQueryOptions()),
      context.queryClient.query(adminUsersQueryOptions()),
    ]),
  component: AdminPage,
});

// GLB-013 : export des données et suppression du compte. Page privée.
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  beforeLoad: requireSession,
  component: AccountPage,
});

// GLB-013 : pages légales, publiques.
const legalNoticeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/notice',
  component: LegalNoticePage,
});

const privacyPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/privacy',
  component: PrivacyPolicyPage,
});

const termsOfUseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/terms',
  component: TermsOfUsePage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  notesRoute,
  noteRoute,
  adminRoute,
  accountRoute,
  legalNoticeRoute,
  privacyPolicyRoute,
  termsOfUseRoute,
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

// État d'historique (jamais dans l'URL) : un lien ne peut pas le reproduire.
declare module '@tanstack/history' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface HistoryState {
    /** GLB-013 : retour sur l'accueil après la suppression du compte. */
    accountDeleted?: boolean;
  }
}

// Augmentation des types du router : seule une `interface` peut être fusionnée.
declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: AppRouter;
  }
}
