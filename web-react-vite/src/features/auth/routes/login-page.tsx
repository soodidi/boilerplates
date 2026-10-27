import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { useResendVerification, useSignIn } from '../api/auth-api';
import { authErrorMessage, isEmailNotVerified } from '../api/auth-errors';
import { AuthLayout, authLinkClass } from '../components/auth-layout';
import { FormMessage } from '../components/form-message';
import { signInFormSchema } from '../schemas/auth';

export function LoginPage() {
  const m = useMessages();
  const navigate = useNavigate();
  const { redirect, error: linkError } = useSearch({ from: '/login' });
  const signIn = useSignIn();
  const resend = useResendVerification();

  const form = useForm({
    resolver: zodResolver(signInFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values);
      await navigate({ to: redirect ?? '/notes' });
    } catch {
      // Le message d'erreur vient de l'état de la mutation.
    }
  });

  return (
    <AuthLayout title={m.auth.login.title}>
      {linkError ? (
        <p role="alert" className="text-sm text-destructive">
          {m.auth.login.verificationLinkInvalid}
        </p>
      ) : null}
      <form noValidate className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={m.auth.fields.email} error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
          )}
        </FormField>
        <FormField label={m.auth.fields.password} error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          )}
        </FormField>

        <FormMessage
          error={signIn.isError ? authErrorMessage(signIn.error, m) : undefined}
          success={resend.isSuccess ? m.auth.login.verificationSent : undefined}
        />
        {isEmailNotVerified(signIn.error) ? (
          <Button
            type="button"
            variant="secondary"
            disabled={resend.isPending}
            onClick={() => {
              resend.mutate(form.getValues('email').trim().toLowerCase());
            }}
          >
            {m.auth.login.resendVerification}
          </Button>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? m.auth.login.submitting : m.auth.login.submit}
        </Button>
      </form>
      <div className="grid gap-2">
        <Link to="/forgot-password" className={authLinkClass}>
          {m.auth.login.forgotPassword}
        </Link>
        <Link to="/signup" className={authLinkClass}>
          {m.auth.login.noAccount}
        </Link>
      </div>
    </AuthLayout>
  );
}
