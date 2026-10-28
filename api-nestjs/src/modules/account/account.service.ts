import { Injectable } from '@nestjs/common';
import { UserDataRegistry } from '../../common/user-data/index.js';
import { type AccountExportResponse } from './account.schemas.js';

/** GLB-013 : droit d'accès. Le module ne lit aucune table : il passe par le registre. */
@Injectable()
export class AccountService {
  constructor(private readonly userData: UserDataRegistry) {}

  async export(userId: string, now = new Date()): Promise<AccountExportResponse> {
    return { exportedAt: now.toISOString(), data: await this.userData.exportAll(userId) };
  }
}
