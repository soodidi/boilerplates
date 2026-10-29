import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { createTestDatabase } from '../../../test/database.js';
import { NotesRepository } from './notes.repository.js';
import { notes } from './notes.table.js';

const ALICE = '019a1f3e-0000-7000-8000-00000000000a';
const BOB = '019a1f3e-0000-7000-8000-00000000000b';

describe('NotesRepository (PostgreSQL)', () => {
  const database = createTestDatabase(inject('databaseUrl'));
  const repository = new NotesRepository(database.db);

  beforeEach(() => database.reset());
  afterAll(() => database.close());

  async function seed(titles: string[], userId = ALICE) {
    // Dates distinctes et croissantes pour un ordre déterministe.
    await database.db.insert(notes).values(
      titles.map((title, index) => ({
        userId,
        title,
        createdAt: new Date(Date.UTC(2026, 9, 1, 12, 0, index)),
      })),
    );
  }

  it('inserts a note with a UUID v7 and timestamps', async () => {
    const note = await repository.insert({ userId: ALICE, title: 'Hello' });

    expect(note.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
    expect(note.content).toBe('');
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('pages through notes, newest first, without gaps or duplicates', async () => {
    await seed(['n1', 'n2', 'n3', 'n4', 'n5']);

    const first = await repository.findPage({ userId: ALICE, limit: 2, cursor: null });
    const second = await repository.findPage({ userId: ALICE, limit: 2, cursor: first.nextCursor });
    const third = await repository.findPage({ userId: ALICE, limit: 2, cursor: second.nextCursor });

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

    const coffee = await repository.findPage({
      userId: ALICE,
      q: 'coffee',
      limit: 10,
      cursor: null,
    });
    const percent = await repository.findPage({ userId: ALICE, q: '%', limit: 10, cursor: null });

    expect(coffee.notes.map((note) => note.title).sort()).toEqual(['Buy coffee', 'COFFEE beans']);
    expect(percent.notes.map((note) => note.title)).toEqual(['100% done']);
  });

  it("never returns another user's notes", async () => {
    await seed(['alice note'], ALICE);
    await seed(['bob note'], BOB);

    const page = await repository.findPage({ userId: BOB, limit: 10, cursor: null });

    expect(page.notes.map((note) => note.title)).toEqual(['bob note']);
  });

  it("finds a note by id for its owner only, and counts every user's notes", async () => {
    const note = await repository.insert({ userId: ALICE, title: 'alice note' });
    await seed(['bob note'], BOB);

    expect(await repository.findById(ALICE, note.id)).toMatchObject({ id: note.id });
    expect(await repository.findById(BOB, note.id)).toBeNull();
    expect(await repository.countAll()).toBe(2);
  });
});
