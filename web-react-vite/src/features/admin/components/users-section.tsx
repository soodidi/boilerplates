import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  type AdminUser,
  adminUsersQueryOptions,
  sessionQueryOptions,
  useAdminUserAction,
} from '@/features/auth';
import { useMessages } from '@/i18n';
import { isForbidden } from '@/lib/errors';
import {
  isStaleAccount,
  isWrongPassword,
  useEraseSuspendedUser,
  useExportSuspendedUser,
} from '../api/admin-api';
import { eraseUserFormSchema } from '../schemas/admin';

type ActionType = 'ban' | 'unban' | 'export';
/** Actions qui se confirment : un clic de travers aurait de lourds effets. */
type ConfirmedAction = 'ban' | 'erase';

/**
 * BE-010 : comptes, avec suspension des comptes ordinaires. Les admins viennent de la configuration
 * de l'API (ADMIN_EMAILS) : aucune action sur eux ici, sauf lever une suspension. GLB-013 : sur un
 * compte suspendu, qui ne peut plus le faire lui-même, export et effacement de ses données.
 * L'API vérifie chaque action.
 */
export function UsersSection() {
  const m = useMessages();
  const titleId = useId();
  const { data } = useSuspenseQuery(adminUsersQueryOptions());
  const { data: session } = useQuery(sessionQueryOptions());
  const action = useAdminUserAction();
  const exportUser = useExportSuspendedUser();
  const eraseUser = useEraseSuspendedUser();
  const [done, setDone] = useState<string | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const isPending = action.isPending || exportUser.isPending || eraseUser.isPending;
  // Après une suppression, la carte disparaît : le focus passe sur le message, qui reste.
  const status = useRef<HTMLParagraphElement>(null);

  function run(user: AdminUser, type: ActionType) {
    // Un second clic pendant l'envoi est ignoré (le bouton garde le focus : pas de `disabled`).
    if (isPending) return;
    setDone(null);
    setFailure(null);
    const callbacks = {
      onError: (error: unknown) => {
        setFailure(error);
      },
    };
    if (type === 'export') {
      exportUser.mutate(user.id, {
        ...callbacks,
        onSuccess: () => {
          setDone(m.admin.users.exported);
        },
      });
    } else {
      action.mutate(
        { type, userId: user.id },
        {
          ...callbacks,
          onSuccess: () => {
            setDone(m.admin.users.saved);
          },
        },
      );
    }
  }

  /** Mot de passe faux : renvoyé au formulaire, qui l'affiche sous le champ. */
  async function erase(user: AdminUser, password: string) {
    setDone(null);
    setFailure(null);
    try {
      await eraseUser.mutateAsync({ userId: user.id, password });
    } catch (error) {
      if (isWrongPassword(error)) throw error;
      setFailure(error);
      return;
    }
    setDone(m.admin.users.erased(user.name));
    status.current?.focus();
  }

  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="text-xl font-semibold">
        {m.admin.users.title}
      </h2>
      <p className="text-sm text-muted-foreground">{m.admin.users.description}</p>
      <p ref={status} tabIndex={-1} role="status" className="text-sm text-success">
        {done}
      </p>
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {isForbidden(failure)
            ? m.admin.users.forbidden
            : isStaleAccount(failure)
              ? m.admin.users.stale
              : m.admin.users.error}
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
            isPending={isPending}
            onAction={(type) => {
              run(user, type);
            }}
            onErase={(password) => erase(user, password)}
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
  onErase: (password: string) => Promise<void>;
};

function UserCard({ user, isSelf, isPending, onAction, onErase }: UserCardProps) {
  const m = useMessages();
  const role = user.role ?? 'user';
  const isAdmin = role === 'admin';
  const [confirming, setConfirming] = useState<ConfirmedAction | null>(null);
  // Après « Confirmer » ou « Annuler », le focus revient sur le bouton qui a ouvert la confirmation.
  const returnFocusTo = useRef<ConfirmedAction | null>(null);
  const restoreFocus = (kind: ConfirmedAction) => (button: HTMLButtonElement | null) => {
    if (button && returnFocusTo.current === kind) {
      button.focus();
      returnFocusTo.current = null;
    }
  };
  const confirmButton = useRef<HTMLButtonElement>(null);
  const confirmTextId = useId();
  useEffect(() => {
    // Le focus passe sur la confirmation, que le clavier et les lecteurs d'écran trouvent.
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);
  function close() {
    returnFocusTo.current = confirming;
    setConfirming(null);
  }
  function open(kind: ConfirmedAction) {
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
      {isSelf ? null : isAdmin ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{m.admin.users.managedByConfig}</p>
          {/* Suspendu avant d'être nommé : lever la suspension est sans risque (BE-010). */}
          {user.banned ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label={m.admin.users.unban}
                name={user.name}
                variant="secondary"
                isPending={isPending}
                onClick={() => {
                  onAction('unban');
                }}
              />
            </div>
          ) : null}
        </div>
      ) : confirming === 'erase' ? (
        <EraseForm name={user.name} onErase={onErase} onCancel={close} />
      ) : confirming === 'ban' ? (
        <div className="grid gap-2">
          <p id={confirmTextId} className="text-sm">
            {m.admin.users.confirmBan(user.name)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              ref={confirmButton}
              aria-describedby={confirmTextId}
              onClick={() => {
                onAction('ban');
                close();
              }}
            >
              {m.admin.users.confirm}
            </Button>
            <Button variant="secondary" aria-describedby={confirmTextId} onClick={close}>
              {m.admin.users.cancel}
            </Button>
          </div>
        </div>
      ) : user.banned ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={m.admin.users.unban}
            name={user.name}
            variant="secondary"
            isPending={isPending}
            onClick={() => {
              onAction('unban');
            }}
          />
          {/* GLB-013 : le compte suspendu ne peut plus le faire lui-même ; l'admin répond à sa demande. */}
          <ActionButton
            label={m.admin.users.exportData}
            name={user.name}
            variant="secondary"
            isPending={isPending}
            onClick={() => {
              onAction('export');
            }}
          />
          <ActionButton
            label={m.admin.users.erase}
            name={user.name}
            variant="destructive"
            isPending={isPending}
            buttonRef={restoreFocus('erase')}
            onClick={() => {
              open('erase');
            }}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={m.admin.users.ban}
            name={user.name}
            variant="destructive"
            isPending={isPending}
            buttonRef={restoreFocus('ban')}
            onClick={() => {
              open('ban');
            }}
          />
        </div>
      )}
    </li>
  );
}

type EraseFormProps = {
  name: string;
  onErase: (password: string) => Promise<void>;
  onCancel: () => void;
};

/**
 * GLB-013 : effacement définitif d'un compte suspendu, après ressaisie du mot de passe de l'admin
 * (une session volée ne suffit pas). FE-006 : React Hook Form + Zod.
 */
function EraseForm({ name, onErase, onCancel }: EraseFormProps) {
  const m = useMessages();
  const textId = useId();
  const form = useForm({
    resolver: zodResolver(eraseUserFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { password: '' },
  });
  const { errors, isSubmitting } = form.formState;
  useEffect(() => {
    // Le focus passe sur le champ, que le clavier et les lecteurs d'écran trouvent.
    form.setFocus('password');
  }, [form]);

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await onErase(password);
    } catch {
      form.setError('password', { message: m.admin.users.wrongPassword });
    }
  });

  return (
    <form
      noValidate
      aria-describedby={textId}
      className="grid gap-2"
      onSubmit={(event) => void onSubmit(event)}
    >
      <p id={textId} className="text-sm">
        {m.admin.users.confirmErase(name)}
      </p>
      <FormField label={m.admin.users.yourPassword} error={errors.password?.message}>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {m.admin.users.confirm}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {m.admin.users.cancel}
        </Button>
      </div>
    </form>
  );
}

type ActionButtonProps = {
  label: string;
  name: string;
  variant: 'secondary' | 'destructive';
  isPending: boolean;
  buttonRef?: (button: HTMLButtonElement | null) => void;
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
