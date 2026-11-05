import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull, lt, ne, notInArray, or } from 'drizzle-orm';
import { DB, type Database, type Transaction } from '../../database/database.module.js';
import { ADMIN_ROLE, DEFAULT_ROLE, hasAdminRole } from './access-control.js';
import { accounts, rateLimits, sessions, users, verifications } from './auth.table.js';

/** Plus longue fenêtre de rate limiting (5 min, auth.config.ts) : au-delà, un compteur ne sert plus. */
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * BE-002 : lectures propres au module auth, en plus de celles de Better Auth.
 * Ne sélectionne jamais un token ni un hachage de mot de passe.
 */
@Injectable()
export class AuthRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findUser(userId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        role: users.role,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user ?? null;
  }

  async countUsers(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(users);
    return row?.value ?? 0;
  }

  /**
   * BE-010 : rôle donné hors de Better Auth, seulement par la liste ADMIN_EMAILS (ConfiguredAdmins),
   * et bannissement levé si `liftBan`. Seulement pour une adresse vérifiée : sinon, un
   * inconnu inscrit d'avance avec l'adresse du futur admin (et son propre mot de passe) en
   * hériterait. Renvoie null si aucun compte ne correspond.
   */
  async setRoleOfVerifiedEmail(
    email: string,
    role: string,
    { liftBan }: { liftBan: boolean },
  ): Promise<{ id: string; granted: boolean } | null> {
    return this.db.transaction(async (tx) => {
      const verified = and(eq(users.email, email), eq(users.emailVerified, true));
      // Verrou de ligne : deux instances qui démarrent ensemble ne journalisent pas deux fois.
      const [current] = await tx
        .select({ role: users.role })
        .from(users)
        .where(verified)
        .for('update');
      if (!current) return null;
      const [updated] = await tx
        .update(users)
        .set(liftBan ? { role, banned: false, banReason: null, banExpires: null } : { role })
        .where(verified)
        .returning({ id: users.id });
      // `granted` : le compte n'avait pas ce rôle avant (journalisé par ConfiguredAdmins).
      return updated ? { id: updated.id, granted: !hasAdminRole(current.role) } : null;
    });
  }

  /**
   * BE-010 : rôle `user` pour tout compte hors de la liste dont le rôle n'est pas `user` (`admin`,
   * mais aussi une valeur multiple comme `user,admin`), et ses sessions révoquées, dans une
   * transaction. Liste vide : tous ces comptes. Renvoie les ids des comptes rétrogradés.
   */
  async demoteAdminsNotIn(emails: readonly string[]): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      const demoted = await tx
        .update(users)
        .set({ role: DEFAULT_ROLE })
        .where(
          and(
            ne(users.role, DEFAULT_ROLE),
            emails.length > 0 ? notInArray(users.email, [...emails]) : undefined,
          ),
        )
        .returning({ id: users.id });
      const ids = demoted.map(({ id }) => id);
      if (ids.length > 0) await tx.delete(sessions).where(inArray(sessions.userId, ids));
      return ids;
    });
  }

  /**
   * BE-010 / GLB-013 : rôle et suspension d'un compte, pour les actions d'administration. Une
   * suspension expirée ne compte plus (Better Auth la lève à la connexion suivante).
   */
  async findAccountState(
    userId: string,
    now = new Date(),
  ): Promise<{ role: string | null; suspended: boolean } | null> {
    const [user] = await this.db
      .select({ role: users.role, banned: users.banned, banExpires: users.banExpires })
      .from(users)
      .where(eq(users.id, userId));
    return user ? { role: user.role, suspended: isSuspended(user, now) } : null;
  }

  /**
   * GLB-013 : efface un compte suspendu, comme Better Auth après `/delete-user` (données des modules,
   * puis sessions, moyens de connexion et compte), en une transaction qui verrouille le compte et
   * revérifie qu'il est suspendu et pas admin : un compte réactivé ou promu entre-temps est épargné.
   */
  async eraseSuspendedAccount(
    userId: string,
    eraseModules: (tx: Transaction) => Promise<void>,
    now = new Date(),
  ): Promise<'erased' | 'not_found' | 'admin' | 'not_suspended'> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ role: users.role, banned: users.banned, banExpires: users.banExpires })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (!user) return 'not_found';
      if (hasAdminRole(user.role)) return 'admin';
      if (!isSuspended(user, now)) return 'not_suspended';
      await eraseModules(tx);
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(accounts).where(eq(accounts.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
      return 'erased';
    });
  }

  /** Un admin peut-il encore se connecter (non banni, ou bannissement expiré) ? */
  async hasActiveAdmin(now = new Date()): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, ADMIN_ROLE),
          or(eq(users.banned, false), isNull(users.banned), lt(users.banExpires, now)),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  findSessions(userId: string) {
    return this.db
      .select({
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        expiresAt: sessions.expiresAt,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }

  findSignInMethods(userId: string) {
    return this.db
      .select({
        providerId: accounts.providerId,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));
  }

  /**
   * GLB-013 : Better Auth n'efface une session ou un jeton expiré que si on le lui présente à
   * nouveau, et jamais ses compteurs de rate limiting (clé : IP et route).
   */
  async deleteExpiredAuthData(now: Date) {
    const [expiredSessions, expiredVerifications, staleRateLimits] = await Promise.all([
      this.db.delete(sessions).where(lt(sessions.expiresAt, now)),
      this.db.delete(verifications).where(lt(verifications.expiresAt, now)),
      this.db
        .delete(rateLimits)
        .where(lt(rateLimits.lastRequest, now.getTime() - RATE_LIMIT_RETENTION_MS)),
    ]);
    return {
      sessions: expiredSessions.rowCount ?? 0,
      verifications: expiredVerifications.rowCount ?? 0,
      rateLimits: staleRateLimits.rowCount ?? 0,
    };
  }
}

/** Suspendu : banni, et la suspension n'a pas expiré. */
function isSuspended(
  user: { banned: boolean | null; banExpires: Date | null },
  now: Date,
): boolean {
  return user.banned === true && (user.banExpires === null || user.banExpires > now);
}
