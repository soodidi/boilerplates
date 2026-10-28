import { Link, Outlet } from '@tanstack/react-router';
import { AccountMenu } from '@/features/auth';
import { LegalFooter } from '@/features/legal';
import { useMessages } from '@/i18n';

const navLinkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground';

export function RootLayout() {
  const m = useMessages();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* FE-008 : lien d'évitement pour la navigation au clavier. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        {m.app.skipToContent}
      </a>
      <header className="border-b border-border">
        <nav
          aria-label={m.app.mainNavigation}
          className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3"
        >
          <span className="mr-4 font-semibold">{m.app.name}</span>
          <Link
            to="/"
            className={navLinkClass}
            activeOptions={{ exact: true }}
            activeProps={{ className: 'text-foreground', 'aria-current': 'page' }}
          >
            {m.app.nav.home}
          </Link>
          <Link
            to="/notes"
            className={navLinkClass}
            activeProps={{ className: 'text-foreground', 'aria-current': 'page' }}
          >
            {m.app.nav.notes}
          </Link>
          <div className="ml-auto">
            <AccountMenu linkClassName={navLinkClass} />
          </div>
        </nav>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 focus:outline-none"
      >
        <Outlet />
      </main>
      <LegalFooter />
    </div>
  );
}
