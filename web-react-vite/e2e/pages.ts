/**
 * Every route of src/app/router.tsx, with the URL the responsive E2E test opens.
 * src/app/router.test.ts fails when a route is added to the router but not here.
 */
export const PUBLIC_PAGES: Record<string, string> = {
  '/': '/',
  '/login': '/login',
  '/signup': '/signup',
  '/forgot-password': '/forgot-password',
  '/reset-password': '/reset-password?token=t',
  '/legal/notice': '/legal/notice',
  '/legal/privacy': '/legal/privacy',
  '/legal/terms': '/legal/terms',
};

/** Private routes: opened after signing in with the demo account (an administrator in the mocks). */
export const PRIVATE_PAGES: Record<string, string> = {
  '/notes': '/notes',
  // A note of the demo account (src/mocks/db.ts).
  '/notes/$id': '/notes/019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f',
  '/admin': '/admin',
  '/account': '/account',
};

export const NOT_FOUND_PAGE = '/page-inexistante';
