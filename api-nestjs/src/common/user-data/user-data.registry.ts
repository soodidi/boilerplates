import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { DB, type Database } from '../../database/database.module.js';
import { ContributesUserData, type UserDataContributor } from './user-data-contributor.js';

/** GLB-013 : export et effacement des données d'un utilisateur, à travers tous les modules. */
@Injectable()
export class UserDataRegistry implements OnModuleInit {
  private contributors: UserDataContributor[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    @Inject(DB) private readonly db: Database,
  ) {}

  // Tous les providers sont instanciés avant le premier `onModuleInit`.
  onModuleInit() {
    const contributors = this.discovery
      .getProviders({ metadataKey: ContributesUserData.KEY })
      .map((wrapper) => wrapper.instance as UserDataContributor | undefined)
      .filter((instance) => instance !== undefined);

    const keys = contributors.map((contributor) => contributor.key);
    const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
    if (duplicate) throw new Error(`Duplicate user data contributor key: ${duplicate}`);

    this.contributors = contributors;
  }

  list(): readonly UserDataContributor[] {
    return this.contributors;
  }

  /** Une section par contributeur, sous sa clé, filtrée par son schéma. */
  async exportAll(userId: string): Promise<Record<string, unknown>> {
    const sections = await Promise.all(
      this.contributors.map(async (contributor) => [
        contributor.key,
        contributor.schema.parse(await contributor.export(userId)),
      ]),
    );
    return Object.fromEntries(sections) as Record<string, unknown>;
  }

  /** Tout ou rien : si un contributeur échoue, aucune donnée n'est effacée. */
  async eraseAll(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const contributor of this.contributors) await contributor.erase(userId, tx);
    });
  }
}
