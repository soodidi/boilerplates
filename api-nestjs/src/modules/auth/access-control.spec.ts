import { admin } from 'better-auth/plugins';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_DISABLED_PATHS,
  ADMIN_OPEN_PATHS,
  ADMIN_SELF_PATHS,
  roles,
} from './access-control.js';

// BE-010 : une route ajoutée au plugin `admin` (mise à jour de Better Auth) doit être classée
// avant d'être servie : ouverte aux admins, ouverte à toute session, ou fermée.
describe('admin plugin routes', () => {
  const pluginPaths: string[] = Object.values(admin().endpoints).map((endpoint) => endpoint.path);
  const classified = [...ADMIN_OPEN_PATHS, ...ADMIN_SELF_PATHS, ...ADMIN_DISABLED_PATHS];

  it('classifies every route of the plugin', () => {
    expect(pluginPaths.filter((path) => !classified.includes(path))).toEqual([]);
  });

  it('lists only routes that exist, each in a single list', () => {
    expect(classified.filter((path) => !pluginPaths.includes(path))).toEqual([]);
    expect(new Set(classified).size).toBe(classified.length);
  });
});

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
