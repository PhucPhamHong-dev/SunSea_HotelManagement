export class ReservationConflictError extends Error {
  readonly code = 'RESERVATION_CONFLICT';

  constructor() {
    super('Reservation overlaps an existing active reservation');
  }
}
