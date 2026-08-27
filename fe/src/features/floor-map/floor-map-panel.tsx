'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Room } from '../../lib/api/api-client';
import { FloorMap } from './floor-map';
import { getRealtimeSocket } from '../../lib/websocket/realtime-client';

interface FloorMapPanelProps {
  floorId: string;
  floorNumber: number;
  rooms: Room[];
  isLoading?: boolean;
  isError?: boolean;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  selectionKind?: 'room' | 'advanceReservation' | 'activeStay';
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousFloor: () => void;
  onNextFloor: () => void;
}

export function FloorMapPanel({ floorId, floorNumber, rooms, isLoading = false, isError = false, selectedRoomId, onSelectRoom, selectionKind = 'room', canGoPrevious, canGoNext, onPreviousFloor, onNextFloor }: FloorMapPanelProps) {
  const queryClient = useQueryClient();
  const [realtimeReady, setRealtimeReady] = useState(false);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rooms'] });
    socket.on('connect', () => setRealtimeReady(true));
    socket.on('disconnect', () => setRealtimeReady(false));
    socket.on('room.status.updated', invalidate);
    socket.on('reservation.created', invalidate);
    socket.on('reservation.updated', invalidate);
    socket.on('reservation.checked_in', invalidate);
    socket.on('reservation.checked_out', invalidate);
    socket.on('reservation.no_show', invalidate);
    socket.on('housekeeping.updated', invalidate);
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room.status.updated', invalidate);
      socket.off('reservation.created', invalidate);
      socket.off('reservation.updated', invalidate);
      socket.off('reservation.checked_in', invalidate);
      socket.off('reservation.checked_out', invalidate);
      socket.off('reservation.no_show', invalidate);
      socket.off('housekeeping.updated', invalidate);
    };
  }, [queryClient]);

  const floorRooms = rooms.filter((room) => room.floorId === floorId);
  return (
    <section className="floor-panel" data-floor-id={floorId}>
      <div className="floor-panel__heading">
        <div>
          <h2>Sơ đồ phòng <span>·</span> Tầng {floorNumber}</h2>
        </div>
        <span className={`floor-panel__sync ${realtimeReady ? 'is-live' : ''}`}>{realtimeReady ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>
      </div>
      {isError && <p className="inline-api-warning">Không tải được dữ liệu phòng từ backend. Sơ đồ đang giữ cấu trúc tầng, trạng thái sẽ xuất hiện khi API sẵn sàng.</p>}
      {isLoading && <p className="inline-api-warning">Đang tải dữ liệu phòng…</p>}
      {!isLoading && !isError && floorRooms.length === 0 && <p className="empty-copy">Chưa có phòng trong tầng này.</p>}
      <div className="floor-map__viewport">
        <button type="button" className="floor-map__navigation floor-map__navigation--previous" aria-label="Tầng trước" disabled={!canGoPrevious} onClick={onPreviousFloor}>‹</button>
        <FloorMap floorNumber={floorNumber} rooms={floorRooms} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} selectionKind={selectionKind} />
        <button type="button" className="floor-map__navigation floor-map__navigation--next" aria-label="Tầng sau" disabled={!canGoNext} onClick={onNextFloor}>›</button>
      </div>
    </section>
  );
}
