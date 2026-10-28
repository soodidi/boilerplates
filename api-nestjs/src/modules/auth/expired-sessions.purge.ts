import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';

export const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * GLB-013 : les sessions expirées (IP, navigateur) sont effacées au démarrage, puis toutes les
 * 24 heures. La production garde toujours une instance active ; plusieurs instances peuvent purger
 * en même temps sans risque (simple DELETE).
 */
@Injectable()
export class ExpiredSessionsPurge implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ExpiredSessionsPurge.name);
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
      const count = await this.repository.deleteExpiredSessions(now);
      if (count > 0) this.logger.log(`Purged ${count} expired sessions`);
    } catch (error) {
      // Réessayée au prochain passage ; l'API reste disponible.
      this.logger.error(
        'Expired sessions purge failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
