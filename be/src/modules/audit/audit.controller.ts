import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/api-response';
import { AuditRepository } from './audit.repository';

@ApiTags('audit-logs')
@ApiCookieAuth('hotel_session')
@UseGuards(SupabaseAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly repository: AuditRepository) {}

  @Get()
  @ApiOperation({ summary: 'List immutable audit records' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query('entity') entity?: string) {
    return this.repository.list(user.accessToken, entity);
  }
}
