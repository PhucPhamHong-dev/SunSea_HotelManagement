import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseService } from '../infrastructure/supabase/supabase.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ description: 'Backend is healthy' })
  getHealth() {
    return { status: 'ok', service: 'sunsea-be', timezone: process.env.APP_TIMEZONE ?? process.env.TZ ?? 'UTC' };
  }

  @Get('supabase')
  @ApiOperation({ summary: 'Supabase connectivity health check' })
  async getSupabaseHealth() {
    const { error } = await this.supabase.getAdminClient().from('floors').select('id').limit(1);
    return { status: error ? 'degraded' : 'ok', dependency: 'supabase', message: error?.message };
  }
}
