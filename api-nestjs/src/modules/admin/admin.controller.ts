import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  ParseUUIDPipe,
  Res,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { fromNodeHeaders } from 'better-auth/node';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { responseSchema } from '../../common/openapi.js';
import { type AccountExportResponse, accountExportResponseSchema } from '../account/index.js';
import { Session, UserHasPermission, type UserSession } from '../auth/index.js';
import {
  type AdminStatsResponse,
  adminStatsResponseSchema,
  type EraseUserInput,
  eraseUserSchema,
} from './admin.schemas.js';
import { AdminService } from './admin.service.js';

/**
 * BE-010 : modèle de route réservée. Le décorateur cite une action déclarée dans
 * `auth/access-control.ts` ; le guard global répond 403 (Problem Details) sans la permission.
 * Chaque route réservée a son test e2e de refus.
 */
@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseInterceptors(StandardSchemaSerializerInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @UserHasPermission({ permissions: { stats: ['read'] } })
  @SerializeOptions({ schema: adminStatsResponseSchema })
  @ApiOkResponse({ schema: responseSchema(adminStatsResponseSchema) })
  @ApiForbiddenResponse({ description: 'Permission stats:read missing' })
  stats(): Promise<AdminStatsResponse> {
    return this.adminService.stats();
  }

  // GLB-013 : un compte suspendu ne peut plus exporter ni effacer ses données ; l'admin le fait à sa
  // demande. Jamais sur un admin (403), seulement sur un compte suspendu (409). POST pour l'effacement :
  // il porte le mot de passe de l'admin dans son corps.
  @Get('users/:id/export')
  @UserHasPermission({ permissions: { account: ['export'] } })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @SerializeOptions({ schema: accountExportResponseSchema })
  @ApiOkResponse({ schema: responseSchema(accountExportResponseSchema) })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiForbiddenResponse({ description: 'Permission account:export missing, or target is an admin' })
  @ApiNotFoundResponse({ description: 'Unknown account' })
  @ApiConflictResponse({ description: 'Account not suspended' })
  async exportUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Session() session: UserSession,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AccountExportResponse> {
    const result = await this.adminService.exportSuspended(id, session.user.id);
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Disposition', 'attachment; filename="account-export.json"');
    return result;
  }

  @Post('users/:id/erase')
  @HttpCode(204)
  @UserHasPermission({ permissions: { account: ['erase'] } })
  // Irréversible : peu d'essais par minute (comme /delete-user), mot de passe de l'admin exigé.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiNoContentResponse({ description: 'Account and its data erased' })
  @ApiBadRequestResponse({ description: 'Invalid id or wrong password' })
  @ApiForbiddenResponse({ description: 'Permission account:erase missing, or target is an admin' })
  @ApiNotFoundResponse({ description: 'Unknown account' })
  @ApiConflictResponse({ description: 'Account not suspended' })
  eraseUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: eraseUserSchema }) body: EraseUserInput,
    @Session() session: UserSession,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.adminService.eraseSuspended(id, {
      id: session.user.id,
      headers: fromNodeHeaders(request.headers),
      password: body.password,
    });
  }
}
