import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { z } from 'zod';
import { createTestDatabase } from '../../../test/database.js';
import { DB, type Transaction } from '../../database/database.module.js';
// Seule table avec `user_id` disponible : un test peut dépendre d'un module, pas le code de common/.
import { notes } from '../../modules/notes/notes.table.js';
import { ContributesUserData, type UserDataContributor } from './user-data-contributor.js';
import { UserDataRegistry } from './user-data.registry.js';

const ALICE = '019a1f3e-0000-7000-8000-00000000000a';
const BOB = '019a1f3e-0000-7000-8000-00000000000b';

@ContributesUserData()
@Injectable()
class NotesContributor implements UserDataContributor {
  readonly key = 'notes';
  readonly tables = [notes];
  readonly schema = z.array(z.object({ title: z.string() }));
  // Le champ `secret` n'est pas dans le schéma : il ne doit pas sortir.
  export = () => Promise.resolve([{ title: 'note', secret: 'hash' }]);
  async erase(userId: string, tx: Transaction) {
    await tx.delete(notes).where(eq(notes.userId, userId));
  }
}

@ContributesUserData()
@Injectable()
class FailingContributor implements UserDataContributor {
  readonly key = 'failing';
  readonly tables = [];
  readonly schema = z.object({ ok: z.boolean() });
  export = () => Promise.resolve({ ok: true });
  erase = () => Promise.reject(new Error('boom'));
}

@ContributesUserData()
@Injectable()
class DuplicateNotesContributor extends NotesContributor {}

describe('UserDataRegistry (PostgreSQL)', () => {
  const database = createTestDatabase(inject('databaseUrl'));

  beforeEach(() => database.reset());
  afterAll(() => database.close());

  async function createRegistry(contributors: (new (...args: never[]) => UserDataContributor)[]) {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [UserDataRegistry, { provide: DB, useValue: database.db }, ...contributors],
    }).compile();
    await moduleRef.init();
    return moduleRef.get(UserDataRegistry);
  }

  async function notesOf(userId: string) {
    return database.db.select().from(notes).where(eq(notes.userId, userId));
  }

  it('discovers the decorated providers and exports one filtered section per key', async () => {
    const registry = await createRegistry([NotesContributor, FailingContributor]);

    expect(registry.list().map((contributor) => contributor.key)).toEqual(['notes', 'failing']);
    expect(await registry.exportAll(ALICE)).toEqual({
      notes: [{ title: 'note' }],
      failing: { ok: true },
    });
  });

  it("erases the user's rows only", async () => {
    await database.db.insert(notes).values([
      { userId: ALICE, title: 'alice' },
      { userId: BOB, title: 'bob' },
    ]);
    const registry = await createRegistry([NotesContributor]);

    await registry.eraseAll(ALICE);

    expect(await notesOf(ALICE)).toEqual([]);
    expect(await notesOf(BOB)).toHaveLength(1);
  });

  it('erases nothing when a contributor fails', async () => {
    await database.db.insert(notes).values({ userId: ALICE, title: 'alice' });
    const registry = await createRegistry([NotesContributor, FailingContributor]);

    await expect(registry.eraseAll(ALICE)).rejects.toThrow('boom');

    expect(await notesOf(ALICE)).toHaveLength(1);
  });

  it('refuses two contributors with the same key', async () => {
    await expect(createRegistry([NotesContributor, DuplicateNotesContributor])).rejects.toThrow(
      'Duplicate user data contributor key: notes',
    );
  });
});
