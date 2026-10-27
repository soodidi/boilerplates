import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { useRequestPasswordReset } from '../api/auth-api';
import { authErrorMessage } from '../api/auth-errors';
import { AuthLayout, authLinkClass } from '../components/auth-layout';
import { FormMessage } from '../components/form-message';
import { forgotPasswordFormSchema } from '../schemas/auth';

export function ForgotPasswordPage() {
  const m = useMessages();
  const requestReset = useRequestPasswordReset();

  const form = useForm({
    resolver: zodResolver(forgotPasswordFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await requestReset.mutateAsync(email);
    } catch {
      // Le message d'erreur vient de l'état de la mutation.
    }
  });

  return (
    <AuthLayout title={m.auth.forgot.title}>
      <p className="text-sm text-muted-foreground">{m.auth.forgot.description}</p>
      <form noValidate className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={m.auth.fields.email} error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
          )}
        </FormField>

        {/* BE-006 : même confirmation que le compte existe ou non. */}
        <FormMessage
          error={requestReset.isError ? authErrorMessage(requestReset.error, m) : undefined}
          success={requestReset.isSuccess ? m.auth.forgot.sent : undefined}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? m.auth.forgot.submitting : m.auth.forgot.submit}
        </Button>
      </form>
      <Link to="/login" className={authLinkClass}>
        {m.auth.signup.backToLogin}
      </Link>
    </AuthLayout>
  );
}
