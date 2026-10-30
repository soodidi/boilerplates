import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, userAc } from 'better-auth/plugins/admin/access';

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
   * BE-010 : lister les comptes, changer leur rôle, les bannir, révoquer leurs sessions. Rien qui
   * permette de prendre un compte (mot de passe, e-mail, création, usurpation) ni de le supprimer.
   */
  admin: ac.newRole({
    user: ['list', 'get', 'set-role', 'ban'],
    session: ['revoke'],
    stats: ['read'],
  }),
};

export const DEFAULT_ROLE = 'user';
export const ADMIN_ROLE = 'admin';

/** Routes du plugin `admin` ouvertes aux admins (BE-010) : elles exigent les permissions du rôle `admin`. */
export const ADMIN_OPEN_PATHS = [
  '/admin/list-users',
  '/admin/get-user',
  '/admin/set-role',
  '/admin/ban-user',
  '/admin/unban-user',
  '/admin/revoke-user-sessions',
];

/**
 * Routes du plugin `admin` ouvertes à toute session : elles ne renseignent que sur ses propres
 * droits (le web demande ses permissions à l'API, BE-010). Par HTTP, une session est exigée et le
 * `role` ou le `userId` du corps est ignoré (un `userId` mal formé reçoit 400, voir auth.config.ts).
 * Côté serveur, `auth.api.userHasPermission` sans `headers` croit le `role` du corps : toujours
 * lui passer les en-têtes de la requête.
 */
export const ADMIN_SELF_PATHS = ['/admin/has-permission'];

/**
 * Routes du plugin `admin` fermées, même si un rôle recevait leur permission :
 * - prise de contrôle d'un compte : usurpation (l'activer demande un ADR de projet), mot de passe,
 *   e-mail (`update-user`), création d'un compte déjà vérifié sans les règles du mot de passe ;
 * - sessions d'un compte : leur liste contient les tokens ; `revoke-user-sessions` suffit ;
 * - suppression par un admin : elle n'efface pas les données des modules (GLB-013). Seul
 *   l'utilisateur supprime son compte (`/delete-user`) ; un admin peut le bannir.
 */
export const ADMIN_DISABLED_PATHS = [
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
  '/admin/set-user-password',
  '/admin/update-user',
  '/admin/create-user',
  '/admin/list-user-sessions',
  '/admin/revoke-user-session',
  '/admin/remove-user',
];
