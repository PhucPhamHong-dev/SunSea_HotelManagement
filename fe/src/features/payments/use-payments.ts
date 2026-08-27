'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/api-client';

export function usePayments(reservationId?: string) {
  return useQuery({
    queryKey: ['payments', reservationId],
    queryFn: async () => (await apiClient.payments.list({ reservationId: reservationId as string })).data.data,
    enabled: Boolean(reservationId),
  });
}
