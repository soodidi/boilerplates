import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { isProblemDetailsError } from '@/lib/problem-details';
import { useCreateNote } from '../api/notes-api';
import { createNoteFormSchema } from '../schemas/note';

const FORM_FIELDS = ['title', 'content'] as const;

function isFormField(field: string): field is (typeof FORM_FIELDS)[number] {
  return (FORM_FIELDS as readonly string[]).includes(field);
}

export function CreateNoteForm() {
  const m = useMessages();
  const createNote = useCreateNote();
  const [created, setCreated] = useState(false);

  const form = useForm({
    resolver: zodResolver(createNoteFormSchema(m)),
    // FE-006 : validation au blur, puis à chaque frappe après la première erreur.
    mode: 'onTouched',
    defaultValues: { title: '', content: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setCreated(false);
    try {
      await createNote.mutateAsync(values);
      form.reset();
      setCreated(true);
    } catch (error) {
      // FE-006 : les erreurs de l'API (Problem Details) sont reportées sur les champs concernés.
      const fieldErrors = isProblemDetailsError(error) ? error.fieldErrors : [];
      for (const { field, message } of fieldErrors) {
        if (isFormField(field)) form.setError(field, { message: message ?? m.notes.form.error });
      }
      if (fieldErrors.length === 0) form.setError('root', { message: m.notes.form.error });
    }
  });

  return (
    <form
      noValidate
      aria-labelledby="create-note-title"
      className="grid gap-4 rounded-md border border-border p-4"
      onSubmit={(event) => void onSubmit(event)}
    >
      <h2 id="create-note-title" className="text-lg font-semibold">
        {m.notes.form.title}
      </h2>

      <FormField label={m.notes.form.titleLabel} error={errors.title?.message}>
        {(control) => <Input {...control} autoComplete="off" {...form.register('title')} />}
      </FormField>

      <FormField label={m.notes.form.contentLabel} error={errors.content?.message}>
        {(control) => <Textarea {...control} {...form.register('content')} />}
      </FormField>

      {errors.root?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? m.notes.form.submitting : m.notes.form.submit}
        </Button>
        <p role="status" className="text-sm text-success">
          {created ? m.notes.form.success : null}
        </p>
      </div>
    </form>
  );
}
