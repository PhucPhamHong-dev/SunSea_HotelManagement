'use client';

import type { AdvanceReservationListItem } from '../../lib/api/api-client';
import { formatCurrency, formatDateRange } from '../calendar/calendar-utils';

interface AdvanceReservationsProps {
  reservations: AdvanceReservationListItem[];
  selectedReservationId: string | null;
  onSelect: (reservation: AdvanceReservationListItem) => void;
  isLoading?: boolean;
  isError?: boolean;
}

export function AdvanceReservations({ reservations, selectedReservationId, onSelect, isLoading = false, isError = false }: AdvanceReservationsProps) {
  const items = reservations
    .filter((reservation) => ['draft', 'confirmed'].includes(reservation.status))
    .sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));

  return (
    <section className="advance-panel" aria-labelledby="advance-title">
      <div className="advance-panel__heading">
        <span className="key-mark" aria-hidden="true">◆</span>
        <h2 id="advance-title">Phòng đặt trước</h2>
      </div>
      {isLoading && <p className="inline-api-warning">Đang tải danh sách đặt trước…</p>}
      {isError && <p className="inline-api-warning">Chưa tải được danh sách đặt trước từ backend.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="empty-copy">Chưa có phòng đặt trước.</p>}
      <div className="advance-list">
        {items.map((reservation) => {
          const selected = reservation.reservationId === selectedReservationId;
          const depositPaid = reservation.depositPaidAmount > 0;
          return (
            <button key={reservation.reservationId} type="button" className={`advance-row${selected ? ' is-selected' : ''}`} onClick={() => onSelect(reservation)} aria-pressed={selected}>
              <span className="advance-row__room">{reservation.roomNumber || `Loại ${reservation.roomTypeName}`}</span>
              <span className="advance-row__dot">·</span>
              <span className="advance-row__guest">{reservation.guestName || '—'}</span>
              <span className="advance-row__dot">·</span>
              <span className="advance-row__date">{formatDateRange(reservation.checkInAt, reservation.checkOutAt)}</span>
              <span className={`advance-row__deposit${depositPaid ? ' is-paid' : ''}`}>{depositPaid ? `Đã cọc ${formatCurrency(reservation.depositPaidAmount)}` : 'Chưa cọc'}</span>
              <span className="advance-row__arrow" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
