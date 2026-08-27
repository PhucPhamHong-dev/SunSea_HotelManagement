'use client';

import type { Reservation } from '../../lib/api/api-client';
import { monthGrid, reservationStartsOn } from './calendar-utils';

interface CalendarPanelProps {
  month: Date;
  selectedDate: string;
  reservations: Reservation[];
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: Date) => void;
}

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function CalendarPanel({ month, selectedDate, reservations, onSelectDate, onChangeMonth }: CalendarPanelProps) {
  const cells = monthGrid(month);
  const monthLabel = `Tháng ${String(month.getMonth() + 1).padStart(2, '0')} / ${month.getFullYear()}`;

  const shiftMonth = (offset: number) => {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };

  return (
    <section className="calendar-panel" aria-labelledby="calendar-title">
      <div className="calendar-panel__heading">
        <button type="button" className="icon-button" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}>‹</button>
        <div>
          <h2 id="calendar-title">Lịch phòng</h2>
          <p>{monthLabel}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Tháng sau" onClick={() => shiftMonth(1)}>›</button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="calendar-grid" role="grid" aria-label={`Lịch phòng ${monthLabel}`}>
        {cells.map(({ key, date, inMonth }) => (
          <button
            key={key}
            type="button"
            className={`calendar-day${inMonth ? '' : ' calendar-day--outside'}${selectedDate === key ? ' calendar-day--selected' : ''}`}
            onClick={() => onSelectDate(key)}
            aria-label={`Ngày ${date.getDate()} tháng ${date.getMonth() + 1}`}
          >
            <span>{date.getDate()}</span>
            <span className="calendar-day__dots" aria-hidden="true">
              {reservations.filter((reservation) => reservationStartsOn(reservation, key)).slice(0, 3).map((reservation) => (
                <i className={`calendar-dot calendar-dot--${reservation.status}`} key={reservation.id} />
              ))}
            </span>
          </button>
        ))}
      </div>
      <p className="calendar-panel__hint">Chọn ngày để xem trạng thái phòng</p>
    </section>
  );
}
