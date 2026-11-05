import { Module } from '@nestjs/common';
import { AccountModule } from '../account/index.js';
import { AuthModule } from '../auth/index.js';
import { NotesModule } from '../notes/index.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

/** BE-010 : routes d'administration propres à l'app. Celles des comptes sont dans le plugin (/v1/auth/admin/*). */
@Module({
  imports: [AccountModule, AuthModule, NotesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
