import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { responseSchema } from '../../common/openapi.js';
import { Session, type UserSession } from '../auth/index.js';
import {
  type CreateNoteInput,
  createNoteSchema,
  type ListNotesQuery,
  listNotesQuerySchema,
  type NotePageResponse,
  notePageResponseSchema,
  type NoteResponse,
  noteResponseSchema,
} from './notes.schemas.js';
import { NotesService } from './notes.service.js';
import { type Note } from './notes.table.js';

function toResponse(note: Note): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  };
}

/** BE-002 : HTTP uniquement (validation, mapping, codes de retour). Aucune règle métier ici. */
@ApiTags('notes')
@Controller({ path: 'notes', version: '1' })
@UseInterceptors(StandardSchemaSerializerInterceptor)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @SerializeOptions({ schema: notePageResponseSchema })
  @ApiOkResponse({ schema: responseSchema(notePageResponseSchema) })
  async list(
    @Session() session: UserSession,
    @Query({ schema: listNotesQuerySchema }) query: ListNotesQuery,
  ): Promise<NotePageResponse> {
    const page = await this.notesService.list(session.user.id, query);
    return { data: page.notes.map(toResponse), nextCursor: page.nextCursor };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({ schema: noteResponseSchema })
  @ApiCreatedResponse({ schema: responseSchema(noteResponseSchema) })
  async create(
    @Session() session: UserSession,
    @Body({ schema: createNoteSchema }) body: CreateNoteInput,
  ): Promise<NoteResponse> {
    return toResponse(await this.notesService.create(session.user.id, body));
  }
}
