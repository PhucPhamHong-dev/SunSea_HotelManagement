'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/api-client';
import type { Room } from '../../lib/api/api-client';

export function useRooms(floorId?: string, selectedDate?: string, enabled = true) {
  return useQuery({
    queryKey: ['rooms', floorId ?? 'all', selectedDate ?? 'current'],
    queryFn: async (): Promise<Room[]> => (await apiClient.rooms.statusByDate({ floorId, date: selectedDate as string })).data.data,
    enabled: enabled && Boolean(selectedDate),
  });
}

export function useCompleteHousekeeping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => apiClient.rooms.updateHousekeeping(roomId, { status: 'ready' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
