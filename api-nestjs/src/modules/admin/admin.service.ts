import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserDataRegistry } from '../../common/user-data/index.js';
import { type AccountExportResponse, AccountService } from '../account/index.js';
import { hasAdminRole, UsersService } from '../auth/index.js';
import { NotesService } from '../notes/index.js';
import { type AdminStatsResponse } from './admin.schemas.js';

/** BE-002 : les nombres et les données viennent des services des autres modules, jamais de leurs tables. */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
    private readonly accountService: AccountService,
    private readonly userData: UserDataRegistry,
  ) {}

  async stats(): Promise<AdminStatsResponse> {
    const [users, notes] = await Promise.all([
      this.usersService.count(),
      this.notesService.count(),
    ]);
    return { users, notes };
  }

  /** GLB-013 : export d'un compte suspendu, qui ne peut plus le faire lui-même (même contenu que « Mon compte »). */
  async exportSuspended(userId: string, actorId: string): Promise<AccountExportResponse> {
    await this.assertSuspendedUser(userId);
    const result = await this.accountService.export(userId);
    this.logger.log({ action: 'user.data_exported', actorId, targetId: userId }, 'Admin action');
    return result;
  }

  /**
   * GLB-013 : effacement d'un compte suspendu, comme `/delete-user` : les données des modules dans une
   * transaction, puis le compte, puis une seconde passe pour ce qu'une requête concurrente aurait écrit.
   */
  async eraseSuspended(userId: string, actorId: string): Promise<void> {
    await this.assertSuspendedUser(userId);
    await this.userData.eraseAll(userId);
    await this.usersService.deleteAccount(userId);
    await this.userData.eraseAll(userId);
    this.logger.log({ action: 'user.erased', actorId, targetId: userId }, 'Admin action');
  }

  /** BE-010 : jamais sur un admin (géré par la configuration), seulement sur un compte suspendu. */
  private async assertSuspendedUser(userId: string): Promise<void> {
    const state = await this.usersService.accountState(userId);
    if (!state) throw new NotFoundException();
    if (hasAdminRole(state.role))
      throw new ForbiddenException('Admins are managed by configuration');
    if (!state.banned)
      throw new ConflictException('Only a suspended account can be handled by an admin');
  }
}
