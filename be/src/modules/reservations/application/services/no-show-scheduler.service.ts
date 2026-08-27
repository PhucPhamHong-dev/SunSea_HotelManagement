import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RealtimeBus } from '../../../realtime/application/realtime-bus';
import { RealtimeEventName } from '../../../realtime/application/realtime-event.types';
import { ProcessOverdueNoShowsUseCase } from '../use-cases/process-overdue-no-shows.use-case';
import type { ReservationRepository } from '../ports/reservation.repository';

const PROCESS_INTERVAL_MS = 60_000;

@Injectable()
export class NoShowSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NoShowSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private isProcessing = false;

  constructor(
    private readonly processOverdueNoShows: ProcessOverdueNoShowsUseCase,
    private readonly realtimeBus: RealtimeBus,
    @Inject('ReservationRepository') private readonly reservations: ReservationRepository,
  ) {}

  onModuleInit(): void {
    this.run();
    this.timer = setInterval(() => this.run(), PROCESS_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private run(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    void this.process()
      .catch((error: unknown) => {
        this.logger.error('Unable to process overdue advance reservations', error instanceof Error ? error.stack : undefined);
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }

  private async process(): Promise<void> {
    const [noShows, expiredDrafts] = await Promise.all([
      this.processOverdueNoShows.execute(),
      this.reservations.releaseExpiredDraftReservations(),
    ]);
    const released = [...noShows, ...expiredDrafts];
    if (!released.length) return;

    const occurredAt = new Date().toISOString();
    for (const reservation of released) {
      if (!reservation.roomId) continue;
      this.realtimeBus.emitEvent({
        version: 1,
        event: RealtimeEventName.ROOM_STATUS_UPDATED,
        entity: 'room',
        entityId: reservation.roomId,
        occurredAt,
        payload: {
          id: reservation.roomId,
          source: 'reservation_lifecycle_scheduler',
          reservationId: reservation.reservationId,
        },
      });
    }
    if (noShows.length) this.logger.log(`Marked ${noShows.length} overdue advance reservation(s) as no-show`);
    if (expiredDrafts.length) this.logger.log(`Released ${expiredDrafts.length} expired draft hold(s)`);
  }
}
