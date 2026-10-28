import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, lt } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.module.js';
import { accounts, sessions, users } from './auth.table.js';

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
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user ?? null;
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

  /** GLB-013 : Better Auth n'efface une session expirée que si on la lui présente à nouveau. */
  async deleteExpiredSessions(now: Date): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
