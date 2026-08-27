'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, type AdvanceReservationDetailDto } from '../../lib/api/api-client';
import { advanceReservationWindow } from '../calendar/calendar-utils';

export function useReservations(enabled = true) {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => (await apiClient.reservations.list()).data.data,
    enabled,
  });
}

export function useReservation(id?: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => (await apiClient.reservations.get(id as string)).data.data,
    enabled: Boolean(id),
  });
}

export function useAdvanceReservations(enabled = true) {
  const window = advanceReservationWindow();
  return useQuery({
    queryKey: ['advance-reservations', window.from, window.to],
    queryFn: async () => (await apiClient.reservations.listAdvance(window)).data.data,
    enabled,
  });
}

export function useAdvanceReservationDetail(id?: string, enabled = true) {
  return useQuery<AdvanceReservationDetailDto>({
    queryKey: ['advance-reservation-detail', id],
    queryFn: async () => (await apiClient.reservations.advanceDetail(id as string)).data.data,
    enabled: Boolean(id) && enabled,
  });
}
