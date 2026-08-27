'use client';

import { useRealtimeStore } from '../../stores/realtime.store';

export function ConnectionStatus() {
  const { status, stale } = useRealtimeStore();
  return (
    <div className={`connection-status connection-status--${status}`} role="status">
      <span className="connection-status__dot" aria-hidden="true" />
      {status === 'connected' ? 'Đã đồng bộ' : status === 'connecting' ? 'Đang kết nối…' : 'Mất kết nối'}
      {stale && status !== 'connected' ? ' · Dữ liệu có thể chưa mới nhất' : ''}
    </div>
  );
}
