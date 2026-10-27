import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { type NoteCursor, type NotesRepository } from './notes.repository.js';
import { decodeCursor, encodeCursor, NotesService } from './notes.service.js';
import { type NewNote, type Note } from './notes.table.js';

/** BE-008 : un fake du repository plutôt qu'un mock, pour tester le service sans base. */
class FakeNotesRepository {
  readonly saved: Note[] = [];
  lastFindParams: unknown;

  findPage(params: {
    userId: string;
    q?: string | undefined;
    limit: number;
    cursor: NoteCursor | null;
  }) {
    this.lastFindParams = params;
    const page = this.saved.slice(0, params.limit);
    const last = page.at(-1);
    return Promise.resolve({
      notes: page,
      nextCursor:
        this.saved.length > params.limit && last
          ? { createdAt: last.createdAt, id: last.id }
          : null,
    });
  }

  insert(values: NewNote): Promise<Note> {
    const note: Note = {
      id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f',
      userId: values.userId,
      title: values.title,
      content: values.content ?? '',
      createdAt: new Date('2026-10-26T10:00:00.000Z'),
      updatedAt: new Date('2026-10-26T10:00:00.000Z'),
    };
    this.saved.push(note);
    return Promise.resolve(note);
  }
}

const USER_ID = '019a1f3e-0000-7000-8000-000000000001';

describe('NotesService', () => {
  let repository: FakeNotesRepository;
  let service: NotesService;

  beforeEach(() => {
    repository = new FakeNotesRepository();
    service = new NotesService(repository as unknown as NotesRepository);
  });

  it('creates a note owned by the user', async () => {
    const note = await service.create(USER_ID, { title: 'First', content: '' });
    expect(note.title).toBe('First');
    expect(note.userId).toBe(USER_ID);
    expect(repository.saved).toHaveLength(1);
  });

  it('only queries the notes of the user', async () => {
    await service.list(USER_ID, { limit: 20 });

    expect(repository.lastFindParams).toMatchObject({ userId: USER_ID });
  });

  it('returns an opaque cursor when more notes are available', async () => {
    await service.create(USER_ID, { title: 'A', content: '' });
    await service.create(USER_ID, { title: 'B', content: '' });

    const page = await service.list(USER_ID, { limit: 1 });

    expect(page.notes).toHaveLength(1);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(decodeCursor(page.nextCursor!)).toEqual({
      createdAt: new Date('2026-10-26T10:00:00.000Z'),
      id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f',
    });
  });

  it('decodes the cursor before querying the repository', async () => {
    const cursor = {
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e80',
    };

    await service.list(USER_ID, { limit: 20, cursor: encodeCursor(cursor) });

    expect(repository.lastFindParams).toMatchObject({ cursor });
  });

  it('rejects an invalid cursor with a 400 error', async () => {
    await expect(
      service.list(USER_ID, { limit: 20, cursor: 'not-a-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
