import { Inject, Injectable } from '@nestjs/common';
import type { ProcessedNoShow, ReservationRepository } from '../ports/reservation.repository';

@Injectable()
export class ProcessOverdueNoShowsUseCase {
  constructor(@Inject('ReservationRepository') private readonly repository: ReservationRepository) {}

  execute(): Promise<ProcessedNoShow[]> {
    return this.repository.markOverdueConfirmedReservations();
  }
}
