import { describe, expect, it } from 'vitest';
import { type UserDataRegistry } from '../../common/user-data/index.js';
import { AccountService } from './account.service.js';

/** BE-008 : un fake du registre, pour tester le service sans base. */
class FakeUserDataRegistry {
  lastUserId: string | undefined;

  exportAll(userId: string) {
    this.lastUserId = userId;
    return Promise.resolve({ notes: [] });
  }
}

describe('AccountService', () => {
  it('exports the sections of the registry for the user, with the export date', async () => {
    const registry = new FakeUserDataRegistry();
    const service = new AccountService(registry as unknown as UserDataRegistry);

    const result = await service.export('user-1', new Date('2026-10-28T10:00:00.000Z'));

    expect(registry.lastUserId).toBe('user-1');
    expect(result).toEqual({ exportedAt: '2026-10-28T10:00:00.000Z', data: { notes: [] } });
  });
});
