'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/api-client';

export function useGuests(enabled = true) {
  return useQuery({
    queryKey: ['guests'],
    queryFn: async () => (await apiClient.guests.list()).data.data,
    enabled,
  });
}
