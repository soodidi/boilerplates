import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { sessionQueryOptions, useSignOut } from '../api/auth-api';

/** En-tête : lien de connexion, ou adresse de l'utilisateur et bouton de déconnexion. */
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
      {/* FE-008 : une adresse très longue est tronquée plutôt que d'élargir l'en-tête. */}
      <span className="hidden min-w-0 truncate text-sm text-muted-foreground sm:inline">
        {session.user.email}
      </span>
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
