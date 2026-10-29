import { Injectable } from '@nestjs/common';
import { UsersService } from '../auth/index.js';
import { NotesService } from '../notes/index.js';
import { type AdminStatsResponse } from './admin.schemas.js';

/** BE-002 : les nombres viennent des services des autres modules, jamais de leurs tables. */
@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
  ) {}

  async stats(): Promise<AdminStatsResponse> {
    const [users, notes] = await Promise.all([
      this.usersService.count(),
      this.notesService.count(),
    ]);
    return { users, notes };
  }
}
