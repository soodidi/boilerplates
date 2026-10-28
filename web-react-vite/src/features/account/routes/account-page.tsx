import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { sessionQueryOptions } from '@/features/auth';
import { useMessages } from '@/i18n';
import { DeleteAccountSection } from '../components/delete-account-section';
import { ExportSection } from '../components/export-section';

/** GLB-013 : « Mon compte » : export des données et suppression du compte. */
export function AccountPage() {
  const m = useMessages();
  const { data: session } = useQuery(sessionQueryOptions());

  return (
    <div className="grid max-w-2xl gap-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{m.account.title}</h1>
        {session ? (
          <p className="text-sm text-muted-foreground">
            {m.account.signedInAs(session.user.email)}
          </p>
        ) : null}
        <p>
          <Link
            to="/legal/privacy"
            className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
          >
            {m.account.privacyLink}
          </Link>
        </p>
      </header>
      <ExportSection />
      <DeleteAccountSection />
    </div>
  );
}
