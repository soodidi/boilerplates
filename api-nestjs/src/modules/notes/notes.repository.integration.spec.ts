import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { createTestDatabase } from '../../../test/database.js';
import { NotesRepository } from './notes.repository.js';
import { notes } from './notes.table.js';

describe('NotesRepository (PostgreSQL)', () => {
  const database = createTestDatabase(inject('databaseUrl'));
  const repository = new NotesRepository(database.db);

  beforeEach(() => database.reset());
  afterAll(() => database.close());

  async function seed(titles: string[]) {
    // Dates distinctes et croissantes pour un ordre déterministe.
    await database.db.insert(notes).values(
      titles.map((title, index) => ({
        title,
        createdAt: new Date(Date.UTC(2026, 9, 1, 12, 0, index)),
      })),
    );
  }

  it('inserts a note with a UUID v7 and timestamps', async () => {
    const note = await repository.insert({ title: 'Hello' });

    expect(note.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
    expect(note.content).toBe('');
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('pages through notes, newest first, without gaps or duplicates', async () => {
    await seed(['n1', 'n2', 'n3', 'n4', 'n5']);

    const first = await repository.findPage({ limit: 2, cursor: null });
    const second = await repository.findPage({ limit: 2, cursor: first.nextCursor });
    const third = await repository.findPage({ limit: 2, cursor: second.nextCursor });

    expect([...first.notes, ...second.notes, ...third.notes].map((note) => note.title)).toEqual([
      'n5',
      'n4',
      'n3',
      'n2',
      'n1',
    ]);
    expect(third.nextCursor).toBeNull();
  });

  it('filters by title, case-insensitively, treating % and _ literally', async () => {
    await seed(['Buy coffee', 'COFFEE beans', 'Tea', '100% done']);

    const coffee = await repository.findPage({ q: 'coffee', limit: 10, cursor: null });
    const percent = await repository.findPage({ q: '%', limit: 10, cursor: null });

    expect(coffee.notes.map((note) => note.title).sort()).toEqual(['Buy coffee', 'COFFEE beans']);
    expect(percent.notes.map((note) => note.title)).toEqual(['100% done']);
  });
});
