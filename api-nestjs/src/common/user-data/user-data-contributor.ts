import { DiscoveryService } from '@nestjs/core';
import { type PgTable } from 'drizzle-orm/pg-core';
import { type Transaction } from '../../database/database.module.js';

/**
 * GLB-013 : données qu'un module garde pour un utilisateur. Seul chemin vers ces données pour
 * l'export et l'effacement du compte (BE-002 : pas de clé étrangère entre modules).
 */
export type UserDataContributor = {
  /** Clé de la section dans l'export (`data.<key>`). Unique dans l'application. */
  readonly key: string;
  /** Tables du module qui ont une colonne `user_id` : un test vérifie qu'aucune n'est oubliée. */
  readonly tables: readonly PgTable[];
  /** Données de l'utilisateur, prêtes à sérialiser en JSON, sans secret ni hachage. */
  export(userId: string): Promise<unknown>;
  /** Supprime les données de l'utilisateur dans la transaction commune, sans la valider. */
  erase(userId: string, tx: Transaction): Promise<void>;
};

/** Enregistre un provider dans le registre : `@ContributesUserData()` sur la classe, plus `@Injectable()`. */
export const ContributesUserData = DiscoveryService.createDecorator();
