import {
  Controller,
  Get,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { responseSchema } from '../../common/openapi.js';
import { UserHasPermission } from '../auth/index.js';
import { type AdminStatsResponse, adminStatsResponseSchema } from './admin.schemas.js';
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
}
