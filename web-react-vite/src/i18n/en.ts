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
    accountDeleted: 'Your account and your data have been deleted.',
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
      verificationLinkInvalid:
        'This confirmation link is invalid or has expired. Sign in to receive a new one.',
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
      consent: {
        before: 'By creating an account, you accept the ',
        terms: 'terms of use',
        between: ' and acknowledge the ',
        privacy: 'privacy policy',
        after: '.',
      },
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
  account: {
    title: 'My account',
    signedInAs: (email: string) => `Signed in as ${email}`,
    privacyLink: 'Privacy policy',
    export: {
      title: 'Export my data',
      description:
        'Download a file with all the data of your account: profile, sessions and content.',
      submit: 'Download my data',
      submitting: 'Preparing…',
      done: 'File downloaded.',
      error: 'The export could not be prepared. Try again.',
    },
    delete: {
      title: 'Delete my account',
      description: (days: number) =>
        `Deletion is immediate and permanent: your account and all your data are erased. Only backups keep them, for ${days} days at most.`,
      password: 'Current password',
      confirm: 'I understand that my account and my data will be permanently deleted.',
      confirmRequired: 'Tick this box to confirm.',
      submit: 'Delete my account',
      submitting: 'Deleting…',
      wrongPassword: 'Wrong password.',
    },
  },
  legal: {
    footerLabel: 'Legal information',
    notice: 'Legal notice',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    lastUpdated: (date: string) => `Last updated: ${date}`,
  },
  validation: {
    required: 'This field is required.',
    tooLong: (max: number) => `${max} characters maximum.`,
  },
};
