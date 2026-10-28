import { Link } from '@tanstack/react-router';
import { useMessages } from '@/i18n';

const linkClass =
  'text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline';

/** GLB-013 : pages légales accessibles depuis toutes les pages. */
export function LegalFooter() {
  const m = useMessages();

  return (
    <footer className="border-t border-border">
      <nav
        aria-label={m.legal.footerLabel}
        className="mx-auto flex max-w-4xl flex-wrap gap-x-6 gap-y-2 px-4 py-6"
      >
        <Link to="/legal/notice" className={linkClass}>
          {m.legal.notice}
        </Link>
        <Link to="/legal/privacy" className={linkClass}>
          {m.legal.privacy}
        </Link>
        <Link to="/legal/terms" className={linkClass}>
          {m.legal.terms}
        </Link>
      </nav>
    </footer>
  );
}
