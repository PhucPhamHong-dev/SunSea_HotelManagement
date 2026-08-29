'use client';

import type { Room } from '../../lib/api/api-client';
import { roomNumberForFloor } from './floor-layout';

interface FloorMapProps {
  floorNumber: number;
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  selectionKind?: 'room' | 'advanceReservation' | 'activeStay';
}

const statusLabels: Record<Room['status'], string> = {
  available: 'Trống',
  occupied: 'Có khách',
  cleaning: 'Đang dọn',
  reserved: 'Đặt trước',
  out_of_service: 'Ngừng phục vụ',
};

export function FloorMap({ floorNumber, rooms, selectedRoomId, onSelectRoom, selectionKind = 'room' }: FloorMapProps) {
  const layout = roomNumberForFloor(floorNumber);
  const byNumber = new Map(rooms.map((room) => [room.roomNumber, room]));
  return (
    <section className="floor-map__grid" aria-label={`Sơ đồ tầng ${floorNumber}`}>
      {layout.map((item) => {
        if (item.kind === 'elevator') {
          return (
            <div key="elevator" className="elevator" style={{ gridArea: item.area }}>
              <span className="elevator__floor">Tầng {floorNumber}</span>
              <span className="elevator__arrows">↔ ↕</span>
              <span className="elevator__box" aria-hidden="true"><i /><i /></span>
            </div>
          );
        }
        const room = byNumber.get(item.roomNumber);
        if (!room) return null;
        const selected = room.id === selectedRoomId;
        const advanceSelected = selected && selectionKind === 'advanceReservation' && room.status === 'reserved';
        return (
          <button
            key={room.id}
            type="button"
            className={`room-card room-card--${room.status}${selected ? ' room-card--selected' : ''}`}
            style={{ gridArea: item.area }}
            onClick={() => onSelectRoom(room.id)}
            aria-pressed={selected}
            data-testid={`room-${room.roomNumber}`}
          >
            <span className="room-card__number">{room.roomNumber}</span>
            <span className="room-card__beds" aria-label={`${room.bedCount} giường`}>
              {Array.from({ length: room.bedCount }, (_, index) => <span className="bed-icon" key={index} aria-hidden="true"><i /></span>)}
            </span>
            {selected && <span className="room-card__badge room-card__badge--selected">ĐANG CHỌN</span>}
            {room.status === 'reserved' && <span className={`room-card__badge${advanceSelected ? ' room-card__badge--reservation-selected' : ''}`}>ĐẶT TRƯỚC</span>}
            {!selected && room.status !== 'reserved' && <span className="room-card__status">{statusLabels[room.status]}</span>}
          </button>
        );
      })}
    </section>
  );
}
