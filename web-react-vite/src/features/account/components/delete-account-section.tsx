import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { deleteAccountErrorMessage, useDeleteAccount } from '@/features/auth';
import { legalInfo } from '@/features/legal';
import { useMessages } from '@/i18n';
import { deleteAccountFormSchema } from '../schemas/account';

/** GLB-013 : suppression immédiate et définitive, avec mot de passe et confirmation explicite. */
export function DeleteAccountSection() {
  const m = useMessages();
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const titleId = useId();
  const confirmErrorId = useId();

  const form = useForm({
    resolver: zodResolver(deleteAccountFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { password: '', confirm: false },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await deleteAccount.mutateAsync(password);
    } catch {
      // Le message d'erreur vient de l'état de la mutation.
      return;
    }
    await navigate({ to: '/', state: (previous) => ({ ...previous, accountDeleted: true }) });
  });

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-3 rounded-lg border border-destructive p-4 sm:p-6"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {m.account.delete.title}
      </h2>
      <p className="text-sm text-muted-foreground">
        {m.account.delete.description(legalInfo.backupRetentionDays)}
      </p>
      <form noValidate className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={m.account.delete.password} error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          )}
        </FormField>

        <div className="grid gap-1.5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="size-6 shrink-0 accent-destructive"
              aria-invalid={errors.confirm !== undefined}
              aria-describedby={errors.confirm ? confirmErrorId : undefined}
              {...form.register('confirm')}
            />
            {m.account.delete.confirm}
          </label>
          {errors.confirm ? (
            <p id={confirmErrorId} className="text-sm text-destructive">
              {errors.confirm.message}
            </p>
          ) : null}
        </div>

        {deleteAccount.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {deleteAccountErrorMessage(deleteAccount.error, m)}
          </p>
        ) : null}

        <div>
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? m.account.delete.submitting : m.account.delete.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
