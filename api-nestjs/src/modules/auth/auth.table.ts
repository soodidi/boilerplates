import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

/**
 * BE-006 : tables de Better Auth, aux conventions de BE-003 (pluriel, UUID v7, timestamptz).
 * Les noms de champs suivent le schéma de Better Auth : ne pas les renommer.
 */
const timestamps = {
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const users = pgTable('users', {
  id: id(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  // BE-010 : champs du plugin `admin`. Rôle par défaut `user` (aussi pour les comptes existants).
  role: text().default('user'),
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true, precision: 3 }),
  ...timestamps,
});

/** Le token est stocké en clair par Better Auth : la table est aussi sensible qu'un mot de passe (BE-006). */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    token: text().notNull().unique(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    /** BE-010 : champ du plugin `admin`. Toujours vide : l'usurpation d'identité est désactivée. */
    impersonatedBy: uuid(),
    ...timestamps,
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true, precision: 3 }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true, precision: 3 }),
    scope: text(),
    /** Hachage Argon2id (BE-006). */
    password: text(),
    ...timestamps,
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    ...timestamps,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

/** Compteurs du rate limiting de Better Auth, partagés entre instances (BE-006). */
export const rateLimits = pgTable('rate_limits', {
  id: id(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
});

export const authSchema = { users, sessions, accounts, verifications, rateLimits };
