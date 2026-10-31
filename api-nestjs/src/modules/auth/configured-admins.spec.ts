import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Env } from '../../config/env.js';
import { ConfiguredAdmins } from './configured-admins.js';
import { type UsersService } from './users.service.js';

// BE-010 : promotion des comptes de ADMIN_EMAILS au démarrage.
describe('ConfiguredAdmins', () => {
  afterEach(() => vi.restoreAllMocks());

  function configuredAdmins(emails: string[], verified: string[]) {
    const users = {
      promoteToAdmin: vi.fn((email: string) => Promise.resolve(verified.includes(email))),
    };
    const service = new ConfiguredAdmins(
      { ADMIN_EMAILS: emails } as unknown as Env,
      users as unknown as UsersService,
    );
    return { service, users };
  }

  it('promotes each listed address and counts the accounts it could not promote', async () => {
    const { service, users } = configuredAdmins(
      ['grace@example.com', 'ada@example.com'],
      ['grace@example.com'],
    );

    await expect(service.apply()).resolves.toEqual({ promoted: 1, skipped: 1 });
    expect(users.promoteToAdmin).toHaveBeenCalledTimes(2);
  });

  it('does nothing at bootstrap when the list is empty', async () => {
    const { service, users } = configuredAdmins([], []);

    await service.onApplicationBootstrap();

    expect(users.promoteToAdmin).not.toHaveBeenCalled();
  });

  it('never logs an address (BE-007)', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service } = configuredAdmins(['grace@example.com'], ['grace@example.com']);

    await service.onApplicationBootstrap();

    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('@');
  });

  it('keeps the API starting when the database fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service, users } = configuredAdmins(['grace@example.com'], []);
    users.promoteToAdmin.mockRejectedValueOnce(new Error('connection refused'));

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
