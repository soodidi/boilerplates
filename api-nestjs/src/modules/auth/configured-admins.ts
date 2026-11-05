import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ENV, type Env } from '../../config/env.js';
import { UsersService } from './users.service.js';

export const REAPPLY_INTERVAL_MS = 10 * 60 * 1000;

/**
 * BE-010 : les admins sont exactement les comptes de `ADMIN_EMAILS`, liste vide comprise (aucun
 * admin). Au démarrage de chaque instance, après les migrations (`app.listen` suit `runMigrations`
 * dans main.ts), puis toutes les 10 minutes : tout compte hors liste dont le rôle n'est pas `user`
 * redevient `user` et perd ses sessions, puis chaque compte listé dont l'adresse est vérifiée devient
 * admin. Le passage régulier rattrape une instance de l'ancienne version qui aurait redémarré pendant
 * un déploiement avec l'ancienne liste. La liste vient de la configuration de l'environnement,
 * modifiable seulement par une PR sur l'infra ; l'interface ne change aucun rôle.
 * Le bannissement d'un compte listé n'est levé que si plus aucun admin n'est actif (reprise en main).
 * Seuls des nombres sont journalisés, jamais d'adresse (BE-007, GLB-013).
 */
@Injectable()
export class ConfiguredAdmins implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ConfiguredAdmins.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly users: UsersService,
  ) {}

  async onApplicationBootstrap() {
    await this.run(true);
    this.timer = setInterval(() => void this.run(false), REAPPLY_INTERVAL_MS);
    // N'empêche pas le processus de s'arrêter.
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  private async run(atStartup: boolean) {
    try {
      const { grantedIds, revokedIds, ...counts } = await this.apply();
      if (atStartup) this.logger.log(counts, 'Configured admins applied');
      // BE-010 : chaque changement de rôle par la liste, avec des ids seulement (BE-007, GLB-013).
      if (grantedIds.length > 0 || revokedIds.length > 0) {
        this.logger.log({ action: 'admin.role_changed', grantedIds, revokedIds }, 'Admin action');
      }
    } catch (error) {
      // Réessayé au passage suivant ; l'API reste disponible.
      Sentry.captureException(error);
      this.logger.error(
        'Configured admins could not be applied',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async apply() {
    // Avant tout : un admin retiré de la liste ne compte plus parmi les admins actifs.
    const revokedIds = await this.users.demoteAdminsNotIn(this.env.ADMIN_EMAILS);
    const liftBan = !(await this.users.hasActiveAdmin());
    let promoted = 0;
    const grantedIds: string[] = [];
    for (const email of this.env.ADMIN_EMAILS) {
      const result = await this.users.promoteToAdmin(email, { liftBan });
      if (!result) continue;
      promoted += 1;
      if (result.granted) grantedIds.push(result.id);
    }
    return {
      promoted,
      // Compte absent ou adresse pas encore vérifiée.
      skipped: this.env.ADMIN_EMAILS.length - promoted,
      demoted: revokedIds.length,
      grantedIds,
      revokedIds,
    };
  }
}
