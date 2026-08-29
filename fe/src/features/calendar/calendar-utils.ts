import type { Reservation } from '../../lib/api/api-client';

const HOTEL_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function dateKey(date: Date): string {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * The advance-reservation list is the reception's forward-looking queue.
 * It starts at the beginning of today in the hotel timezone and deliberately
 * has no end date, so every effective future booking remains visible.
 */
export function advanceReservationWindow(now = new Date()): { from: string } {
  const today = dateKey(now);
  return {
    from: systemDateTimeLocalToIso(`${today}T00:00`) as string,
  };
}

export function parseDateKey(value: string): Date {
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(year, month - 1, day);
}

export function monthGrid(month: Date): Array<{ key: string; date: Date; inMonth: boolean }> {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      // The grid itself is a pure calendar construct. Keep its generated day
      // key stable even if the receptionist's browser is not in hotel time.
      key: localCalendarDateKey(date),
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

export function reservationStartsOn(reservation: Reservation, key: string): boolean {
  return dateKey(new Date(reservation.plannedCheckInAt)) === key;
}

export function reservationCoversDate(reservation: Reservation, key: string): boolean {
  if (reservation.status === 'cancelled' || reservation.status === 'no_show' || reservation.status === 'checked_out') return false;
  const start = dateKey(new Date(reservation.plannedCheckInAt));
  // A guest who has checked in continues to occupy the room until the
  // checkout operation is completed. `plannedCheckOutAt` is an estimate and
  // must not make an overdue stay disappear from the operational dashboard.
  if (reservation.status === 'checked_in') return key >= start;
  if (!reservation.plannedCheckOutAt || typeof reservation.plannedCheckOutAt !== 'string') return key >= start;
  const end = dateKey(new Date(reservation.plannedCheckOutAt));
  return key >= start && key < end;
}

export function formatDateRange(checkIn: string, checkOut?: string | null): string {
  const start = dateParts(new Date(checkIn));
  if (!checkOut || typeof checkOut !== 'string') return `${start.day}/${start.month} · Chưa xác định`;
  const end = dateParts(new Date(checkOut));
  if (start.month === end.month && start.year === end.year) return `${start.day}–${end.day}/${end.month}`;
  return `${start.day}/${start.month}–${end.day}/${end.month}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: HOTEL_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

export function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOTEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function systemDateTimeLocalToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const utcMillis = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute));
  const date = new Date(utcMillis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}đ`;
}

function dateParts(value: Date): Record<'year' | 'month' | 'day', string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOTEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value).reduce<Record<'year' | 'month' | 'day', string>>((result, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') result[part.type] = part.value;
    return result;
  }, { year: '', month: '', day: '' });
}

function localCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatVndAmountInput(value?: number | string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(digits));
}

export function parseVndAmountInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}
