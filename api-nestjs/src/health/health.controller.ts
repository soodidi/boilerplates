import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health.js';

/** BE-007 : sondes utilisées par la plateforme (OPS-005). */
@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  /** Le processus répond. Ne vérifie aucune dépendance. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Prêt à recevoir du trafic : la base de données répond. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.database.isHealthy()]);
  }
}
