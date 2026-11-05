import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import { type Transaction } from '../../database/database.module.js';
import { ADMIN_ROLE } from './access-control.js';
import { AuthRepository } from './auth.repository.js';

/** BE-002 : ce que les autres modules peuvent savoir des comptes, sans lire les tables d'auth. */
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly auth: AuthService,
  ) {}

  count(): Promise<number> {
    return this.repository.countUsers();
  }

  /**
   * BE-010 : promeut un compte au rôle admin et, par défaut, lève un éventuel bannissement. Appelé
   * seulement pour les adresses de `ADMIN_EMAILS` (ConfiguredAdmins), jamais à l'inscription ni
   * depuis une requête. L'adresse doit être vérifiée. Effet à la requête suivante.
   */
  promoteToAdmin(
    email: string,
    { liftBan = true }: { liftBan?: boolean } = {},
  ): Promise<{ id: string; granted: boolean } | null> {
    return this.repository.setRoleOfVerifiedEmail(email.trim().toLowerCase(), ADMIN_ROLE, {
      liftBan,
    });
  }

  /** BE-010 : seuls les comptes de la liste restent admins ; les autres perdent le rôle et leurs sessions. */
  demoteAdminsNotIn(emails: readonly string[]): Promise<string[]> {
    return this.repository.demoteAdminsNotIn(emails);
  }

  /** GLB-013 : rôle et suspension d'un compte, `null` s'il n'existe pas. */
  accountState(userId: string): Promise<{ role: string | null; suspended: boolean } | null> {
    return this.repository.findAccountState(userId);
  }

  /** GLB-013 : efface un compte suspendu et ses données (modules d'abord, même transaction). */
  eraseSuspendedAccount(
    userId: string,
    eraseModules: (tx: Transaction) => Promise<void>,
  ): Promise<'erased' | 'not_found' | 'admin' | 'not_suspended'> {
    return this.repository.eraseSuspendedAccount(userId, eraseModules);
  }

  /**
   * GLB-013 : ressaisie du mot de passe de l'utilisateur de la requête avant une action
   * irréversible (route serveur de Better Auth, jamais exposée en HTTP).
   */
  async verifyPassword(headers: Headers, password: string): Promise<boolean> {
    try {
      await this.auth.api.verifyPassword({ headers, body: { password } });
      return true;
    } catch (error) {
      if (isAPIError(error)) return false;
      throw error;
    }
  }

  hasActiveAdmin(): Promise<boolean> {
    return this.repository.hasActiveAdmin();
  }
}
