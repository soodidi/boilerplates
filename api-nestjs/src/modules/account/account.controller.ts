import {
  Controller,
  Get,
  Header,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="account-export.json"')
  @SerializeOptions({ schema: accountExportResponseSchema })
  @ApiOkResponse({ schema: responseSchema(accountExportResponseSchema) })
  exportAccount(@Session() session: UserSession): Promise<AccountExportResponse> {
    return this.accountService.export(session.user.id);
  }
}
