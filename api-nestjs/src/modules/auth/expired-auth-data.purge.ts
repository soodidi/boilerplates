import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { AuthRepository } from './auth.repository.js';

export const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * GLB-013 : sessions et jetons expirés, compteurs de rate limiting périmés (IP) effacés au
 * démarrage, puis toutes les 24 heures. Le rythme quotidien suppose une instance toujours active
 * (`min_scale >= 1`, cas de la production) ; à zéro instance, la purge a lieu à chaque démarrage.
 * Plusieurs instances peuvent purger en même temps sans risque (simples DELETE).
 */
@Injectable()
export class ExpiredAuthDataPurge implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ExpiredAuthDataPurge.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly repository: AuthRepository) {}

  onApplicationBootstrap() {
    void this.purge();
    this.timer = setInterval(() => void this.purge(), PURGE_INTERVAL_MS);
    // N'empêche pas le processus de s'arrêter.
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async purge(now = new Date()): Promise<void> {
    try {
      const deleted = await this.repository.deleteExpiredAuthData(now);
      // Journalisé à chaque passage, même à zéro : la preuve que la purge tourne.
      this.logger.log({ deleted }, 'Expired auth data purged');
    } catch (error) {
      // Réessayée au prochain passage ; l'API reste disponible. Sentry alerte si ça dure.
      Sentry.captureException(error);
      this.logger.error(
        'Expired auth data purge failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
