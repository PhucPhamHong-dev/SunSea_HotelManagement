import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseService } from '../../../infrastructure/supabase/supabase.service';
import { RealtimeBus } from './realtime-bus';
import { RealtimeEventName, type RealtimeEvent } from './realtime-event.types';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private channel?: RealtimeChannel;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly bus: RealtimeBus,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.REALTIME_ENABLED === 'false') {
      this.logger.log('Supabase realtime is disabled');
      return;
    }
    this.channel = this.supabase
      .getAdminClient()
      .channel(process.env.REALTIME_CHANNEL ?? 'hotel-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => this.handleChange('rooms', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => this.handleChange('reservations', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservation_services' }, (payload) => this.handleChange('reservation_services', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => this.handleChange('payments', payload));
    this.channel.subscribe((status) => this.logger.log(`Supabase realtime status: ${status}`));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.supabase.getAdminClient().removeChannel(this.channel);
  }

  private handleChange(
    table: 'rooms' | 'reservations' | 'reservation_services' | 'payments',
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ): void {
    const record = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
    const entityId = String(record.id ?? 'unknown');
    const event = this.mapEvent(table, payload);
    if (!event) return;
    const realtimeEvent: RealtimeEvent = {
      version: 1,
      event,
      entity: event === RealtimeEventName.HOUSEKEEPING_UPDATED ? 'housekeeping' : table === 'rooms' ? 'room' : table === 'reservations' ? 'reservation' : table === 'payments' ? 'payment' : 'reservation_service',
      entityId,
      occurredAt: new Date().toISOString(),
      requestId: typeof record.request_id === 'string' ? record.request_id : undefined,
      payload: record,
    };
    this.bus.emitEvent(realtimeEvent);
  }

  private mapEvent(
    table: 'rooms' | 'reservations' | 'reservation_services' | 'payments',
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) {
    if (table === 'rooms' && payload.eventType === 'UPDATE') {
      const next = (payload.new as Record<string, unknown> | null)?.housekeeping_status;
      const previous = (payload.old as Record<string, unknown> | null)?.housekeeping_status;
      return next && next !== previous
        ? RealtimeEventName.HOUSEKEEPING_UPDATED
        : RealtimeEventName.ROOM_STATUS_UPDATED;
    }
    if (table === 'reservations') {
      if (payload.eventType === 'INSERT') return RealtimeEventName.RESERVATION_CREATED;
      if (payload.eventType === 'DELETE') return RealtimeEventName.RESERVATION_CANCELLED;
      const status = (payload.new as Record<string, unknown> | null)?.status;
      if (status === 'checked_in') return RealtimeEventName.RESERVATION_CHECKED_IN;
      if (status === 'checked_out') return RealtimeEventName.RESERVATION_CHECKED_OUT;
      if (status === 'cancelled') return RealtimeEventName.RESERVATION_CANCELLED;
      if (status === 'no_show') return RealtimeEventName.RESERVATION_NO_SHOW;
      return RealtimeEventName.RESERVATION_UPDATED;
    }
    if (table === 'reservation_services') {
      return payload.eventType === 'INSERT' ? RealtimeEventName.SERVICE_ADDED : RealtimeEventName.SERVICE_UPDATED;
    }
    if (payload.eventType === 'INSERT') return RealtimeEventName.PAYMENT_CREATED;
    const paymentStatus = (payload.new as Record<string, unknown> | null)?.status;
    return paymentStatus === 'voided' ? RealtimeEventName.PAYMENT_VOIDED : RealtimeEventName.PAYMENT_UPDATED;
  }
}
