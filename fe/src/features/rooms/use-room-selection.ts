'use client';

import { useState } from 'react';

export function useRoomSelection() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  return { selectedRoomId, selectRoom: setSelectedRoomId };
}
