import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ENV, type Env } from '../../config/env.js';
import { UsersService } from './users.service.js';

/**
 * BE-010 : les admins sont exactement les comptes de `ADMIN_EMAILS`. Au démarrage de chaque instance
 * (déploiement, réveil, montée en charge), après les migrations (`app.listen` suit `runMigrations`
 * dans main.ts) : tout admin absent de la liste redevient `user` et perd ses sessions, puis chaque
 * compte listé dont l'adresse est vérifiée devient admin. La liste vient de la configuration de
 * l'environnement, modifiable seulement par une PR sur l'infra ; l'interface ne change aucun rôle.
 * Un bannissement d'un compte listé n'est levé que si plus aucun admin n'est actif (reprise en main).
 * Liste vide : rien n'est fait (en local, `npm run user:promote` garde la main).
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

  async apply(): Promise<{ promoted: number; skipped: number; demoted: number }> {
    // Avant tout : un admin retiré de la liste ne compte plus parmi les admins actifs.
    const demoted = await this.users.demoteAdminsNotIn(this.env.ADMIN_EMAILS);
    const liftBan = !(await this.users.hasActiveAdmin());
    let promoted = 0;
    for (const email of this.env.ADMIN_EMAILS) {
      if (await this.users.promoteToAdmin(email, { liftBan })) promoted += 1;
    }
    // `skipped` : compte absent ou adresse pas encore vérifiée.
    const result = { promoted, skipped: this.env.ADMIN_EMAILS.length - promoted, demoted };
    this.logger.log(result, 'Configured admins applied');
    return result;
  }
}
