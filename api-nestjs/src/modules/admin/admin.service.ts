import {
  BadRequestException,
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
   * GLB-013 : effacement d'un compte suspendu, comme `/delete-user`, après ressaisie du mot de passe
   * de l'admin (une session volée ne suffit pas pour une action irréversible). Vérification et
   * effacement dans une seule transaction qui verrouille le compte.
   */
  async eraseSuspended(
    userId: string,
    actor: { id: string; headers: Headers; password: string },
  ): Promise<void> {
    if (!(await this.usersService.verifyPassword(actor.headers, actor.password))) {
      throw new BadRequestException('Invalid password');
    }
    const result = await this.usersService.eraseSuspendedAccount(userId, (tx) =>
      this.userData.eraseAllIn(userId, tx),
    );
    assertErasable(result);
    this.logger.log({ action: 'user.erased', actorId: actor.id, targetId: userId }, 'Admin action');
  }

  /** BE-010 : jamais sur un admin (géré par la configuration), seulement sur un compte suspendu. */
  private async assertSuspendedUser(userId: string): Promise<void> {
    const state = await this.usersService.accountState(userId);
    if (!state) throw new NotFoundException();
    if (hasAdminRole(state.role))
      throw new ForbiddenException('Admins are managed by configuration');
    if (!state.suspended)
      throw new ConflictException('Only a suspended account can be handled by an admin');
  }
}

function assertErasable(result: 'erased' | 'not_found' | 'admin' | 'not_suspended'): void {
  if (result === 'not_found') throw new NotFoundException();
  if (result === 'admin') throw new ForbiddenException('Admins are managed by configuration');
  if (result === 'not_suspended') {
    throw new ConflictException('Only a suspended account can be handled by an admin');
  }
}
