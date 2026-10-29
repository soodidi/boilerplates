import { describe, expect, it } from 'vitest';
import { roles } from './access-control.js';

// BE-010 : ce que chaque rôle peut faire, verrouillé indépendamment des routes du plugin.
describe('access control', () => {
  it('gives the user role no administration action', () => {
    expect(roles.user.authorize({ user: ['list'] }).success).toBe(false);
    expect(roles.user.authorize({ session: ['revoke'] }).success).toBe(false);
    expect(roles.user.authorize({ stats: ['read'] }).success).toBe(false);
  });

  it('lets an admin list, change roles, ban and revoke sessions, and read stats', () => {
    expect(
      roles.admin.authorize({
        user: ['list', 'get', 'set-role', 'ban'],
        session: ['revoke'],
        stats: ['read'],
      }).success,
    ).toBe(true);
  });

  it.each([
    'impersonate',
    'impersonate-admins',
    'delete',
    'set-password',
    'set-email',
    'update',
    'create',
  ] as const)('never lets an admin %s a user', (action) => {
    expect(roles.admin.authorize({ user: [action] }).success).toBe(false);
  });

  it('never lets an admin list the sessions of a user (they hold the tokens)', () => {
    expect(roles.admin.authorize({ session: ['list'] }).success).toBe(false);
  });
});
