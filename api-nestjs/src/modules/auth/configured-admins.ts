import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ENV, type Env } from '../../config/env.js';
import { UsersService } from './users.service.js';

/**
 * BE-010 : les comptes de `ADMIN_EMAILS` sont promus admins au démarrage de chaque instance (déploiement,
 * réveil, montée en charge), après les migrations (`app.listen` suit `runMigrations` dans main.ts).
 * La liste vient de la configuration de l'environnement, modifiable seulement par une PR sur l'infra :
 * un admin listé rétrogradé depuis l'interface le redevient. Un bannissement, lui, tient tant qu'un
 * autre admin peut se connecter (compte compromis écarté sans attendre la PR qui le retire de la
 * liste) ; il n'est levé que si plus aucun admin n'est actif, pour reprendre la main.
 * Seuls des nombres sont journalisés, jamais d'adresse (BE-007, GLB-013).
 */
@Injectable()
export class ConfiguredAdmins implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfiguredAdmins.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly users: UsersService,
  ) {}

  async onApplicationBootstrap() {
    if (this.env.ADMIN_EMAILS.length === 0) return;
    try {
      await this.apply();
    } catch (error) {
      // Réessayé au prochain démarrage ; l'API reste disponible.
      Sentry.captureException(error);
      this.logger.error(
        'Configured admins could not be applied',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async apply(): Promise<{ promoted: number; skipped: number }> {
    const liftBan = !(await this.users.hasActiveAdmin());
    let promoted = 0;
    for (const email of this.env.ADMIN_EMAILS) {
      if (await this.users.promoteToAdmin(email, { liftBan })) promoted += 1;
    }
    // `skipped` : compte absent ou adresse pas encore vérifiée.
    const result = { promoted, skipped: this.env.ADMIN_EMAILS.length - promoted };
    this.logger.log(result, 'Configured admins applied');
    return result;
  }
}
