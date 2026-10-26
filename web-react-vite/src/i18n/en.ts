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
  validation: {
    required: 'This field is required.',
    tooLong: (max: number) => `${max} characters maximum.`,
  },
};
