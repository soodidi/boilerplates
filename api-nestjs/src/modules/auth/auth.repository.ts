import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.module.js';
import { ADMIN_ROLE } from './access-control.js';
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
   * BE-010 : rôle donné hors de Better Auth (ADMIN_EMAILS au démarrage, `npm run user:promote` en
   * local), et bannissement levé si `liftBan`. Seulement pour une adresse vérifiée : sinon, un
   * inconnu inscrit d'avance avec l'adresse du futur admin (et son propre mot de passe) en
   * hériterait. Renvoie false si aucun compte ne correspond.
   */
  async setRoleOfVerifiedEmail(
    email: string,
    role: string,
    { liftBan }: { liftBan: boolean },
  ): Promise<boolean> {
    const updated = await this.db
      .update(users)
      .set(liftBan ? { role, banned: false, banReason: null, banExpires: null } : { role })
      .where(and(eq(users.email, email), eq(users.emailVerified, true)))
      .returning({ id: users.id });
    return updated.length > 0;
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
