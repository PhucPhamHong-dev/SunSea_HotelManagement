import { Module } from '@nestjs/common';
import { SupabaseServiceRepository } from './infrastructure/persistence/supabase-service.repository';
import { ServicesController } from './presentation/http/controllers/services.controller';

@Module({
  controllers: [ServicesController],
  providers: [SupabaseServiceRepository, { provide: 'ServiceRepository', useExisting: SupabaseServiceRepository }],
  exports: ['ServiceRepository'],
})
export class ServicesModule {}
