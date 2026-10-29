import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  type AdminUser,
  adminUsersQueryOptions,
  sessionQueryOptions,
  useAdminUserAction,
} from '@/features/auth';
import { useMessages } from '@/i18n';
import { ForbiddenError } from '@/lib/errors';

type ActionType = 'ban' | 'unban' | 'set-role';

/** BE-010 : comptes, avec suspension et changement de rôle. L'API vérifie chaque action. */
export function UsersSection() {
  const m = useMessages();
  const titleId = useId();
  const { data } = useSuspenseQuery(adminUsersQueryOptions());
  const { data: session } = useQuery(sessionQueryOptions());
  const action = useAdminUserAction();

  function run(user: AdminUser, type: ActionType) {
    // Un second clic pendant l'envoi est ignoré (le bouton garde le focus : pas de `disabled`).
    if (action.isPending) return;
    if (type === 'set-role') {
      action.mutate({ type, userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' });
    } else {
      action.mutate({ type, userId: user.id });
    }
  }

  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="text-xl font-semibold">
        {m.admin.users.title}
      </h2>
      <p className="text-sm text-muted-foreground">{m.admin.users.description}</p>
      <p role="status" className="text-sm text-success">
        {action.isSuccess ? m.admin.users.saved : null}
      </p>
      {action.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {action.error instanceof ForbiddenError ? m.admin.users.forbidden : m.admin.users.error}
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
              run(user, type);
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
  onAction: (type: ActionType) => void;
};

function UserCard({ user, isSelf, isPending, onAction }: UserCardProps) {
  const m = useMessages();
  const role = user.role ?? 'user';
  const isAdmin = role === 'admin';
  // Suspendre et nommer administrateur se confirment : un clic de travers aurait de lourds effets.
  const [confirming, setConfirming] = useState<'ban' | 'set-role' | null>(null);
  // Après « Confirmer » ou « Annuler », le focus revient sur le bouton qui a ouvert la confirmation.
  const returnFocusTo = useRef<'ban' | 'set-role' | null>(null);
  const restoreFocus = (kind: 'ban' | 'set-role') => (button: HTMLButtonElement | null) => {
    if (button && returnFocusTo.current === kind) {
      button.focus();
      returnFocusTo.current = null;
    }
  };
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Le focus passe sur la confirmation, que le clavier et les lecteurs d'écran trouvent.
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);
  function close() {
    returnFocusTo.current = confirming;
    setConfirming(null);
  }
  function open(kind: 'ban' | 'set-role') {
    // Pendant un envoi, rien ne s'ouvre : la confirmation serait ignorée.
    if (!isPending) setConfirming(kind);
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 flex-1 gap-1">
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
      {isSelf ? null : confirming ? (
        <div className="grid gap-2">
          <p className="text-sm">
            {confirming === 'ban'
              ? m.admin.users.confirmBan(user.name)
              : m.admin.users.confirmAdmin(user.name)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={confirming === 'ban' ? 'destructive' : 'primary'}
              ref={confirmButton}
              onClick={() => {
                onAction(confirming);
                close();
              }}
            >
              {m.admin.users.confirm}
            </Button>
            <Button variant="secondary" onClick={close}>
              {m.admin.users.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={isAdmin ? m.admin.users.makeUser : m.admin.users.makeAdmin}
            name={user.name}
            variant="secondary"
            isPending={isPending}
            buttonRef={restoreFocus('set-role')}
            onClick={() => {
              if (isAdmin) onAction('set-role');
              else open('set-role');
            }}
          />
          <ActionButton
            label={user.banned ? m.admin.users.unban : m.admin.users.ban}
            name={user.name}
            variant={user.banned ? 'secondary' : 'destructive'}
            isPending={isPending}
            buttonRef={restoreFocus('ban')}
            onClick={() => {
              if (user.banned) onAction('unban');
              else open('ban');
            }}
          />
        </div>
      )}
    </li>
  );
}

type ActionButtonProps = {
  label: string;
  name: string;
  variant: 'secondary' | 'destructive';
  isPending: boolean;
  buttonRef: (button: HTMLButtonElement | null) => void;
  onClick: () => void;
};

/**
 * Libellé court à l'écran (lisible à 320 px), nom du compte en plus pour les lecteurs d'écran :
 * le nom accessible commence par le libellé visible (WCAG 2.5.3).
 */
function ActionButton({ label, name, variant, isPending, buttonRef, onClick }: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      aria-label={`${label} ${name}`}
      aria-disabled={isPending}
      ref={buttonRef}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
