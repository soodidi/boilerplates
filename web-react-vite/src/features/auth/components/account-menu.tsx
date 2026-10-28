import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { sessionQueryOptions, useSignOut } from '../api/auth-api';

/** En-tête : lien de connexion, ou lien « Mon compte » et bouton de déconnexion. */
export function AccountMenu({ linkClassName }: { linkClassName: string }) {
  const m = useMessages();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQueryOptions());
  const signOut = useSignOut();

  if (!session) {
    return (
      <Link to="/login" className={linkClassName}>
        {m.auth.login.title}
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/account"
        className={linkClassName}
        activeProps={{ className: 'text-foreground', 'aria-current': 'page' }}
      >
        {m.account.title}
      </Link>
      <Button
        variant="secondary"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) });
        }}
      >
        {m.auth.signOut}
      </Button>
    </div>
  );
}
