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
   * BE-010 : promeut un compte au rôle admin et, par défaut, lève un éventuel bannissement. Appelé au
   * démarrage pour les adresses de `ADMIN_EMAILS` (ConfiguredAdmins) et en local par
   * `npm run user:promote`, jamais à l'inscription ni depuis une requête. L'adresse doit être
   * vérifiée. Effet à la requête suivante.
   */
  promoteToAdmin(email: string, { liftBan = true }: { liftBan?: boolean } = {}): Promise<boolean> {
    return this.repository.setRoleOfVerifiedEmail(email.trim().toLowerCase(), ADMIN_ROLE, {
      liftBan,
    });
  }

  hasActiveAdmin(): Promise<boolean> {
    return this.repository.hasActiveAdmin();
  }
}
