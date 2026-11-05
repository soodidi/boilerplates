import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Env } from '../../config/env.js';
import { ConfiguredAdmins, REAPPLY_INTERVAL_MS } from './configured-admins.js';
import { type UsersService } from './users.service.js';

// BE-010 : promotion des comptes de ADMIN_EMAILS au démarrage.
describe('ConfiguredAdmins', () => {
  afterEach(() => vi.restoreAllMocks());

  function configuredAdmins(emails: string[], verified: string[], activeAdmin = true) {
    const users = {
      // Compte vérifié déjà admin par défaut (`granted: false`) : aucun changement de rôle.
      promoteToAdmin: vi.fn((email: string, _options?: { liftBan?: boolean }) =>
        Promise.resolve(verified.includes(email) ? { id: `id-${email}`, granted: false } : null),
      ),
      hasActiveAdmin: vi.fn(() => Promise.resolve(activeAdmin)),
      demoteAdminsNotIn: vi.fn((_emails: readonly string[]) => Promise.resolve<string[]>([])),
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

    await expect(service.apply()).resolves.toEqual({
      promoted: 1,
      skipped: 1,
      demoted: 0,
      grantedIds: [],
      revokedIds: [],
    });
    expect(users.promoteToAdmin).toHaveBeenCalledTimes(2);
  });

  it('demotes admins missing from the list before counting the active ones', async () => {
    const { service, users } = configuredAdmins(['grace@example.com'], ['grace@example.com']);
    users.demoteAdminsNotIn.mockResolvedValueOnce(['id-old-admin']);

    await expect(service.apply()).resolves.toMatchObject({ demoted: 1 });
    expect(users.demoteAdminsNotIn).toHaveBeenCalledWith(['grace@example.com']);
    expect(users.demoteAdminsNotIn.mock.invocationCallOrder[0]).toBeLessThan(
      users.hasActiveAdmin.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('keeps bans while another admin can sign in', async () => {
    const { service, users } = configuredAdmins(['grace@example.com'], ['grace@example.com'], true);

    await service.apply();

    expect(users.promoteToAdmin).toHaveBeenCalledWith('grace@example.com', { liftBan: false });
  });

  it('lifts bans only when no admin can sign in any more', async () => {
    const { service, users } = configuredAdmins(
      ['grace@example.com'],
      ['grace@example.com'],
      false,
    );

    await service.apply();

    expect(users.promoteToAdmin).toHaveBeenCalledWith('grace@example.com', { liftBan: true });
  });

  it('demotes every admin when the list is empty (no admin)', async () => {
    const { service, users } = configuredAdmins([], []);

    await service.apply();

    expect(users.demoteAdminsNotIn).toHaveBeenCalledWith([]);
    expect(users.promoteToAdmin).not.toHaveBeenCalled();
  });

  it('applies the list again every 10 minutes, and logs only when a role changed', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service, users } = configuredAdmins(['grace@example.com'], ['grace@example.com']);

    await service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(REAPPLY_INTERVAL_MS);
    users.demoteAdminsNotIn.mockResolvedValueOnce(['id-old-admin']);
    await vi.advanceTimersByTimeAsync(REAPPLY_INTERVAL_MS);
    service.onApplicationShutdown();

    expect(users.demoteAdminsNotIn).toHaveBeenCalledTimes(3);
    // Démarrage, puis le passage qui a retiré le rôle à un compte.
    expect(log).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('logs each role change with ids only (BE-007)', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service, users } = configuredAdmins(['grace@example.com'], ['grace@example.com']);
    users.promoteToAdmin.mockResolvedValueOnce({ id: 'id-grace', granted: true });
    users.demoteAdminsNotIn.mockResolvedValueOnce(['id-old-admin']);

    await service.onApplicationBootstrap();
    service.onApplicationShutdown();

    expect(log).toHaveBeenCalledWith(
      { action: 'admin.role_changed', grantedIds: ['id-grace'], revokedIds: ['id-old-admin'] },
      'Admin action',
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('@');
  });

  it('never logs an address (BE-007)', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service } = configuredAdmins(['grace@example.com'], ['grace@example.com']);

    await service.onApplicationBootstrap();
    service.onApplicationShutdown();

    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('@');
  });

  it('keeps the API starting when the database fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service, users } = configuredAdmins(['grace@example.com'], []);
    users.promoteToAdmin.mockRejectedValueOnce(new Error('connection refused'));

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    service.onApplicationShutdown();
  });
});
