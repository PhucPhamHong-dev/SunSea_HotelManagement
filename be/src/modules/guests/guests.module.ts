import { Module } from '@nestjs/common';
import { SupabaseGuestRepository } from './infrastructure/persistence/supabase-guest.repository';
import { UpdateGuestUseCase } from './application/use-cases/update-guest.use-case';
import { GuestsController } from './presentation/http/controllers/guests.controller';

@Module({
  controllers: [GuestsController],
  providers: [SupabaseGuestRepository, { provide: 'GuestRepository', useExisting: SupabaseGuestRepository }, UpdateGuestUseCase],
  exports: ['GuestRepository'],
})
export class GuestsModule {}
