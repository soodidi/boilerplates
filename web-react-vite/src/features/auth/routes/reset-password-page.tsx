import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { useResetPassword } from '../api/auth-api';
import { authErrorMessage } from '../api/auth-errors';
import { AuthLayout, authLinkClass } from '../components/auth-layout';
import { FormMessage } from '../components/form-message';
import { PASSWORD_MIN, resetPasswordFormSchema } from '../schemas/auth';

/** Page ouverte depuis le lien de l'e-mail : l'API y redirige avec `?token=` ou `?error=`. */
export function ResetPasswordPage() {
  const m = useMessages();
  const { token, error } = useSearch({ from: '/reset-password' });
  const resetPassword = useResetPassword();

  const form = useForm({
    resolver: zodResolver(resetPasswordFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (!token || error) {
    return (
      <AuthLayout focusTitle title={m.auth.reset.title}>
        <p role="alert">{m.auth.reset.invalidLink}</p>
        <Link to="/forgot-password" className={authLinkClass}>
          {m.auth.reset.requestNewLink}
        </Link>
      </AuthLayout>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <AuthLayout focusTitle title={m.auth.reset.title}>
        <p role="status">{m.auth.reset.done}</p>
        <Link to="/login" className={authLinkClass}>
          {m.auth.signup.backToLogin}
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await resetPassword.mutateAsync({ token, newPassword: password });
    } catch {
      // Le message d'erreur vient de l'état de la mutation.
    }
  });

  return (
    <AuthLayout title={m.auth.reset.title}>
      <form noValidate className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={m.auth.fields.newPassword(PASSWORD_MIN)} error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          )}
        </FormField>

        <FormMessage
          error={resetPassword.isError ? authErrorMessage(resetPassword.error, m) : undefined}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? m.auth.reset.submitting : m.auth.reset.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
