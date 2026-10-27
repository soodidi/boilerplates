import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { signInAsDemo } from '@/mocks/db';
import { db } from '@/mocks/db';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { CreateNoteForm } from './create-note-form';

describe('CreateNoteForm', () => {
  beforeEach(() => {
    signInAsDemo();
  });

  it('refuse un titre vide et met le focus sur le champ en erreur', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateNoteForm />);

    await user.click(screen.getByRole('button', { name: 'Ajouter la note' }));

    const title = screen.getByRole('textbox', { name: 'Titre' });
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Ce champ est obligatoire.');
    expect(title).toHaveFocus();
  });

  it('crée la note puis vide le formulaire', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateNoteForm />);

    await user.type(screen.getByRole('textbox', { name: 'Titre' }), 'Acheter du café');
    await user.click(screen.getByRole('button', { name: 'Ajouter la note' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Note ajoutée.');
    expect(screen.getByRole('textbox', { name: 'Titre' })).toHaveValue('');
    expect(db.notes.map((note) => note.title)).toContain('Acheter du café');
  });

  it("affiche sur le champ l'erreur renvoyée par l'API", async () => {
    server.use(
      http.post('*/v1/notes', () =>
        HttpResponse.json(
          {
            title: 'Conflict',
            status: 409,
            errors: [{ field: 'title', code: 'duplicate', message: 'Ce titre existe déjà.' }],
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CreateNoteForm />);

    await user.type(screen.getByRole('textbox', { name: 'Titre' }), 'Doublon');
    await user.click(screen.getByRole('button', { name: 'Ajouter la note' }));

    expect(await screen.findByText('Ce titre existe déjà.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Titre' })).toHaveAttribute('aria-invalid', 'true');
  });
});
