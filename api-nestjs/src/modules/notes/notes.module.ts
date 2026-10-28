import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller.js';
import { NotesRepository } from './notes.repository.js';
import { NotesService } from './notes.service.js';
import { NotesUserData } from './notes.user-data.js';

@Module({
  controllers: [NotesController],
  providers: [NotesService, NotesRepository, NotesUserData],
  // BE-002 : ce que les autres modules peuvent utiliser. Jamais le repository.
  exports: [NotesService],
})
export class NotesModule {}
