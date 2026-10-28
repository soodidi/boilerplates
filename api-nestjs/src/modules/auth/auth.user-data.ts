import { Injectable } from '@nestjs/common';
import { ContributesUserData, type UserDataContributor } from '../../common/user-data/index.js';
import { AuthRepository } from './auth.repository.js';
import { accounts, sessions } from './auth.table.js';

/**
 * GLB-013 : le compte, ses sessions et ses moyens de connexion, dans l'export.
 * L'effacement est fait par Better Auth (`/delete-user`), juste après la transaction des modules :
 * il supprime le compte, puis ses sessions et ses moyens de connexion (clés étrangères internes au module).
 */
@ContributesUserData()
@Injectable()
export class AccountUserData implements UserDataContributor {
  readonly key = 'account';
  readonly tables = [sessions, accounts];

  constructor(private readonly repository: AuthRepository) {}

  async export(userId: string) {
    const [user, userSessions, signInMethods] = await Promise.all([
      this.repository.findUser(userId),
      this.repository.findSessions(userId),
      this.repository.findSignInMethods(userId),
    ]);
    return {
      user: user && {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      sessions: userSessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
      signInMethods: signInMethods.map((method) => ({
        ...method,
        createdAt: method.createdAt.toISOString(),
        updatedAt: method.updatedAt.toISOString(),
      })),
    };
  }

  /** Rien à faire dans la transaction : Better Auth supprime ces lignes ensuite. */
  erase(): Promise<void> {
    return Promise.resolve();
  }
}
