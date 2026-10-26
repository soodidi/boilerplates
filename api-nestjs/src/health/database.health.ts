import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '../database/database.module.js';

/** Vérifie que PostgreSQL répond en moins d'une seconde. */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    @Inject(DB) private readonly db: Database,
  ) {}

  isHealthy() {
    return this.indicators
      .check('database')
      .attempt(async () => {
        await this.db.execute(sql`select 1`);
      })
      .withTimeout(1000);
  }
}
