export const RealtimeEventName = {
  ROOM_STATUS_UPDATED: 'room.status.updated',
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_UPDATED: 'reservation.updated',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_CHECKED_IN: 'reservation.checked_in',
  RESERVATION_CHECKED_OUT: 'reservation.checked_out',
  RESERVATION_NO_SHOW: 'reservation.no_show',
  SERVICE_ADDED: 'service.added',
  SERVICE_UPDATED: 'service.updated',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_UPDATED: 'payment.updated',
  PAYMENT_VOIDED: 'payment.voided',
  HOUSEKEEPING_UPDATED: 'housekeeping.updated',
} as const;

export type RealtimeEventNameValue = (typeof RealtimeEventName)[keyof typeof RealtimeEventName];

export interface RealtimeEvent {
  version: 1;
  event: RealtimeEventNameValue;
  entity: 'room' | 'reservation' | 'reservation_service' | 'payment' | 'housekeeping';
  entityId: string;
  occurredAt: string;
  requestId?: string;
  payload: Record<string, unknown>;
}
