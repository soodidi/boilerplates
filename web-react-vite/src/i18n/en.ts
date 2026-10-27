import { type Messages } from './fr';

export const en: Messages = {
  app: {
    name: 'My app',
    skipToContent: 'Skip to content',
    mainNavigation: 'Main navigation',
    nav: { home: 'Home', notes: 'Notes' },
  },
  errors: {
    title: 'Something went wrong',
    description: 'The team has been notified. You can try again.',
    reload: 'Reload the page',
    retry: 'Try again',
    notFoundTitle: 'Page not found',
    backHome: 'Back to home',
  },
  home: {
    title: 'Welcome',
    description:
      'This boilerplate follows the engineering-guidelines repo. The Notes page shows a complete feature: queries, URL filters and a form.',
    cta: 'See notes',
  },
  notes: {
    title: 'Notes',
    searchLabel: 'Search notes',
    listLabel: 'Notes list',
    empty: 'No notes yet.',
    noResults: (query: string) => `No note matches “${query}”.`,
    loading: 'Loading notes…',
    form: {
      title: 'New note',
      titleLabel: 'Title',
      contentLabel: 'Content',
      submit: 'Add note',
      submitting: 'Adding…',
      success: 'Note added.',
      error: 'The note could not be added.',
    },
  },
  auth: {
    signOut: 'Sign out',
    fields: {
      name: 'Name',
      email: 'Email address',
      password: 'Password',
      newPassword: (min: number) => `Password (at least ${min} characters)`,
    },
    login: {
      title: 'Sign in',
      submit: 'Sign in',
      submitting: 'Signing in…',
      forgotPassword: 'Forgot your password?',
      noAccount: 'No account yet? Create one',
      resendVerification: 'Resend the confirmation email',
      verificationSent: 'Confirmation email sent.',
    },
    signup: {
      title: 'Create an account',
      submit: 'Create my account',
      submitting: 'Creating…',
      haveAccount: 'Already have an account? Sign in',
      checkInboxTitle: 'Check your inbox',
      checkInbox: (email: string) =>
        `If ${email} can be used, an email has just been sent to it. Open the link inside to continue.`,
      backToLogin: 'Back to sign in',
    },
    forgot: {
      title: 'Forgot password',
      description: 'Enter your email address: we will send you a link to choose a new password.',
      submit: 'Send the link',
      submitting: 'Sending…',
      sent: 'If an account exists for this address, an email has just been sent.',
    },
    reset: {
      title: 'New password',
      submit: 'Save the password',
      submitting: 'Saving…',
      done: 'Password changed. You can now sign in.',
      invalidLink: 'This link is invalid or has expired.',
      requestNewLink: 'Request a new link',
    },
    errors: {
      invalidCredentials: 'Incorrect email address or password.',
      emailNotVerified: 'Please confirm your email address first, using the link we sent you.',
      tooManyAttempts: 'Too many attempts. Try again in a few minutes.',
      generic: 'Something went wrong. Please try again.',
    },
    validation: {
      email: 'Invalid email address.',
      passwordTooShort: (min: number) => `At least ${min} characters.`,
    },
  },
  validation: {
    required: 'This field is required.',
    tooLong: (max: number) => `${max} characters maximum.`,
  },
};
