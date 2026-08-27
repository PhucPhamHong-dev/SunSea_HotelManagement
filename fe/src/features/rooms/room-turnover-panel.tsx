'use client';

import { Button } from '@heroui/react';
import type { Room } from '../../lib/api/api-client';

interface RoomTurnoverPanelProps {
  room: Room;
  isPending?: boolean;
  actionMessage?: string;
  onComplete: () => void;
  onBookNew: () => void;
}

/**
 * Operational panel for a room that has been checked out but still needs
 * housekeeping. The server remains the authority for whether the room can
 * accept a new stay; this component only sends the ready transition.
 */
export function RoomTurnoverPanel({ room, isPending = false, actionMessage, onComplete, onBookNew }: RoomTurnoverPanelProps) {
  const isCleaning = room.status === 'cleaning';
  const title = isCleaning ? `Phòng ${room.roomNumber} đang dọn` : `Phòng ${room.roomNumber} chưa sẵn sàng`;
  const description = room.unavailableReason || (isCleaning
    ? 'Sau khi dọn xong, xác nhận để mở lại phòng cho lượt khách mới.'
    : 'Phòng chưa thể tiếp nhận lượt lưu trú mới.');

  return (
    <section className="stay-panel turnover-panel" aria-labelledby="turnover-title">
      <h2 id="turnover-title">{title}</h2>
      <div className="turnover-panel__content">
        <span className="turnover-panel__status">{isCleaning ? 'ĐANG DỌN' : 'CHƯA SẴN SÀNG'}</span>
        <p>{description}</p>
        {isCleaning && (
          <Button className="turnover-panel__button" isDisabled={isPending} onPress={onComplete}>
            {isPending ? 'Đang cập nhật…' : 'Đã dọn xong'}
          </Button>
        )}
        <Button className="turnover-panel__book" variant="secondary" onPress={onBookNew}>Đặt phòng mới</Button>
      </div>
      {actionMessage && <p className="action-message" role="alert">{actionMessage}</p>}
    </section>
  );
}
