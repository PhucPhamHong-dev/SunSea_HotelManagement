'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type CreateStayDto, type CreateStayResponseDto, type Guest, type Reservation } from '../../lib/api/api-client';

export function useIntakePolicy(date?: string, enabled = true) {
  return useQuery({
    queryKey: ['intake-policy', date],
    queryFn: async () => (await apiClient.reservations.intakePolicy({ date: date as string })).data.data,
    enabled: Boolean(date) && enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useCreateStay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStayDto) => apiClient.reservations.createStay(body),
    onSuccess: (response) => {
      const created = response.data.data as CreateStayResponseDto;
      const guest: Guest = {
        id: created.guest.id,
        fullName: created.guest.fullName,
        active: created.guest.active,
        createdAt: created.guest.createdAt,
        updatedAt: created.guest.updatedAt,
        ...(created.guest.phone ? { phone: created.guest.phone } : {}),
        ...(created.guest.idNumber ? { idNumber: created.guest.idNumber } : {}),
        ...(created.guest.dateOfBirth ? { dateOfBirth: created.guest.dateOfBirth } : {}),
        ...(created.guest.idIssuedDate ? { idIssuedDate: created.guest.idIssuedDate } : {}),
        ...(created.guest.address ? { address: created.guest.address } : {}),
      };
      queryClient.setQueryData(['reservation', created.reservation.id], created.reservation);
      queryClient.setQueryData<Reservation[]>(['reservations'], (current) => {
        if (!current) return [created.reservation];
        return [created.reservation, ...current];
      });
      queryClient.setQueryData<Guest[]>(['guests'], (current) => {
        if (!current) return [guest];
        return [guest, ...current];
      });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['advance-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['guests'] });
      void queryClient.invalidateQueries({ queryKey: ['payments', created.reservation.id] });
      void queryClient.invalidateQueries({ queryKey: ['checkout-preview', created.reservation.id] });
    },
  });
}
