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
   * BE-010 : premier administrateur, par une commande lancée à la main (`npm run user:promote`),
   * jamais par une variable d'environnement ni à l'inscription. Effet à la requête suivante.
   */
  promoteToAdmin(email: string): Promise<boolean> {
    return this.repository.setRoleByEmail(email.trim().toLowerCase(), ADMIN_ROLE);
  }
}
