import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import {
  type AdminUser,
  adminUsersQueryOptions,
  sessionQueryOptions,
  useAdminUserAction,
} from '@/features/auth';
import { useMessages } from '@/i18n';

/** BE-010 : comptes, avec bannissement et changement de rôle. L'API vérifie chaque action. */
export function UsersSection() {
  const m = useMessages();
  const titleId = useId();
  const { data } = useSuspenseQuery(adminUsersQueryOptions());
  const { data: session } = useQuery(sessionQueryOptions());
  const action = useAdminUserAction();

  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="text-xl font-semibold">
        {m.admin.users.title}
      </h2>
      <p className="text-sm text-muted-foreground">{m.admin.users.description}</p>
      {action.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {m.admin.users.error}
        </p>
      ) : null}
      {/* FE-008 : des cartes plutôt qu'un tableau, lisibles dès 320 px. */}
      <ul className="grid gap-3">
        {data.users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            // Pas d'action sur son propre compte : un admin ne s'enferme pas dehors.
            isSelf={user.id === session?.user.id}
            isPending={action.isPending}
            onAction={(type) => {
              if (type === 'set-role') {
                action.mutate({
                  type,
                  userId: user.id,
                  role: user.role === 'admin' ? 'user' : 'admin',
                });
              } else {
                action.mutate({ type, userId: user.id });
              }
            }}
          />
        ))}
      </ul>
    </section>
  );
}

type UserCardProps = {
  user: AdminUser;
  isSelf: boolean;
  isPending: boolean;
  onAction: (type: 'ban' | 'unban' | 'set-role') => void;
};

function UserCard({ user, isSelf, isPending, onAction }: UserCardProps) {
  const m = useMessages();
  const role = user.role ?? 'user';

  return (
    <li className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 gap-1">
        <p className="font-medium">
          {user.name}
          {isSelf ? <span className="text-muted-foreground"> ({m.admin.users.you})</span> : null}
        </p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="flex flex-wrap gap-2 text-sm">
          <span>{m.admin.users.roles[role] ?? role}</span>
          {user.banned ? (
            <span className="font-medium text-destructive">{m.admin.users.banned}</span>
          ) : null}
        </p>
      </div>
      {isSelf ? null : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              onAction('set-role');
            }}
          >
            {role === 'admin'
              ? m.admin.users.makeUser(user.name)
              : m.admin.users.makeAdmin(user.name)}
          </Button>
          <Button
            variant={user.banned ? 'secondary' : 'destructive'}
            disabled={isPending}
            onClick={() => {
              onAction(user.banned ? 'unban' : 'ban');
            }}
          >
            {user.banned ? m.admin.users.unban(user.name) : m.admin.users.ban(user.name)}
          </Button>
        </div>
      )}
    </li>
  );
}
