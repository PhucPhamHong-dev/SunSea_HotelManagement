'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/api-client';
import type { Room } from '../../lib/api/api-client';
import { systemDateTimeLocalToIso } from '../calendar/calendar-utils';

export function useRooms(floorId?: string, selectedDate?: string, selectedEndDate?: string | null, enabled = true) {
  const checkInAt = selectedDate ? systemDateTimeLocalToIso(`${selectedDate}T14:00`) : null;
  const checkOutAt = selectedEndDate ? systemDateTimeLocalToIso(`${selectedEndDate}T12:00`) : null;
  const useRangeAvailability = Boolean(checkInAt && checkOutAt);
  return useQuery({
    queryKey: ['rooms', useRangeAvailability ? 'availability' : 'status-by-date', floorId ?? 'all', selectedDate ?? 'current', selectedEndDate ?? 'single-day'],
    queryFn: async (): Promise<Room[]> => {
      if (useRangeAvailability && checkInAt && checkOutAt) {
        return (await apiClient.rooms.availability({ floorId, checkInAt, checkOutAt })).data.data;
      }
      return (await apiClient.rooms.statusByDate({ floorId, date: selectedDate as string })).data.data;
    },
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
