import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { useSignUp } from '../api/auth-api';
import { authErrorMessage } from '../api/auth-errors';
import { AuthLayout, authLinkClass } from '../components/auth-layout';
import { FormMessage } from '../components/form-message';
import { PASSWORD_MIN, signUpFormSchema } from '../schemas/auth';

export function SignupPage() {
  const m = useMessages();
  const signUp = useSignUp();

  const form = useForm({
    resolver: zodResolver(signUpFormSchema(m)),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp.mutateAsync(values);
    } catch {
      // Le message d'erreur vient de l'état de la mutation.
    }
  });

  // BE-006 : même message que l'adresse soit nouvelle ou déjà inscrite.
  if (signUp.isSuccess) {
    return (
      <AuthLayout title={m.auth.signup.checkInboxTitle}>
        <p role="status">{m.auth.signup.checkInbox(form.getValues('email'))}</p>
        <Link to="/login" className={authLinkClass}>
          {m.auth.signup.backToLogin}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={m.auth.signup.title}>
      <form noValidate className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={m.auth.fields.name} error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="name" {...form.register('name')} />}
        </FormField>
        <FormField label={m.auth.fields.email} error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
          )}
        </FormField>
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

        <FormMessage error={signUp.isError ? authErrorMessage(signUp.error, m) : undefined} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? m.auth.signup.submitting : m.auth.signup.submit}
        </Button>
      </form>
      <Link to="/login" className={authLinkClass}>
        {m.auth.signup.haveAccount}
      </Link>
    </AuthLayout>
  );
}
