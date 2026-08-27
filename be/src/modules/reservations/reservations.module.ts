import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SupabaseReservationRepository } from './infrastructure/persistence/supabase-reservation.repository';
import { ReservationService } from './application/services/reservation.service';
import { ReservationsController } from './presentation/http/controllers/reservations.controller';
import { ProcessOverdueNoShowsUseCase } from './application/use-cases/process-overdue-no-shows.use-case';
import { NoShowSchedulerService } from './application/services/no-show-scheduler.service';

@Module({
  imports: [PricingModule, RealtimeModule],
  controllers: [ReservationsController],
  providers: [
    SupabaseReservationRepository,
    { provide: 'ReservationRepository', useExisting: SupabaseReservationRepository },
    ReservationService,
    ProcessOverdueNoShowsUseCase,
    NoShowSchedulerService,
  ],
  exports: [ReservationService],
})
export class ReservationsModule {}
