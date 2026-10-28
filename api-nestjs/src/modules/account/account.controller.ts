import {
  Controller,
  Get,
  Res,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type FastifyReply } from 'fastify';
import { responseSchema } from '../../common/openapi.js';
import { Session, type UserSession } from '../auth/index.js';
import { type AccountExportResponse, accountExportResponseSchema } from './account.schemas.js';
import { AccountService } from './account.service.js';

/** GLB-013 : HTTP uniquement. La suppression du compte est la route `/v1/auth/delete-user`. */
@ApiTags('account')
@Controller({ path: 'account', version: '1' })
@UseInterceptors(StandardSchemaSerializerInterceptor)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('export')
  // Export complet, coûteux pour la base : quelques demandes par minute suffisent.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @SerializeOptions({ schema: accountExportResponseSchema })
  @ApiOkResponse({ schema: responseSchema(accountExportResponseSchema) })
  async exportAccount(
    @Session() session: UserSession,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AccountExportResponse> {
    const result = await this.accountService.export(session.user.id);
    // Après succès seulement : une erreur ne doit pas être téléchargée comme un fichier.
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Disposition', 'attachment; filename="account-export.json"');
    return result;
  }
}
