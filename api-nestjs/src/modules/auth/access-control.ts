import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';

/**
 * BE-010 : référence unique des permissions. Une action s'ajoute ici avant d'être utilisée par
 * `@UserHasPermission`. Une permission porte sur un type de ressource : elle ne remplace jamais la
 * vérification d'appartenance sur la ressource elle-même (BE-006).
 */
export const statements = {
  // Administration des comptes par le plugin `admin` : user (lister, bannir, changer de rôle…), session.
  ...defaultStatements,
  // Exemple de permission propre à l'app : les statistiques de GET /v1/admin/stats.
  stats: ['read'],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  /** Rôle par défaut : aucune action d'administration. */
  user: ac.newRole({ ...userAc.statements }),
  /**
   * Les actions par défaut du plugin, sauf `impersonate` et `delete` : leurs routes sont aussi
   * fermées (`ADMIN_DISABLED_PATHS`).
   */
  admin: ac.newRole({
    ...adminAc.statements,
    user: ['create', 'list', 'set-role', 'ban', 'set-password', 'set-email', 'get', 'update'],
    stats: ['read'],
  }),
};

export const DEFAULT_ROLE = 'user';
export const ADMIN_ROLE = 'admin';

/**
 * Routes du plugin `admin` fermées :
 * - usurpation d'identité : l'activer demande un ADR de projet (BE-010) ;
 * - suppression d'un compte par un admin : elle n'efface pas les données des modules (GLB-013).
 *   Seul l'utilisateur supprime son compte (`/delete-user`) ; un admin peut le bannir.
 */
export const ADMIN_DISABLED_PATHS = [
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
  '/admin/remove-user',
];
