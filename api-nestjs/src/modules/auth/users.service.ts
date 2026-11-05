import { Injectable } from '@nestjs/common';
import { ADMIN_ROLE } from './access-control.js';
import { AuthRepository } from './auth.repository.js';

/** BE-002 : ce que les autres modules peuvent savoir des comptes, sans lire les tables d'auth. */
@Injectable()
export class UsersService {
  constructor(private readonly repository: AuthRepository) {}

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

  /** GLB-013 : rôle et bannissement d'un compte, `null` s'il n'existe pas. */
  accountState(userId: string): Promise<{ role: string | null; banned: boolean } | null> {
    return this.repository.findAccountState(userId);
  }

  /** GLB-013 : supprime le compte et ses données d'authentification (les modules d'abord). */
  deleteAccount(userId: string): Promise<void> {
    return this.repository.deleteAccount(userId);
  }

  hasActiveAdmin(): Promise<boolean> {
    return this.repository.hasActiveAdmin();
  }
}
