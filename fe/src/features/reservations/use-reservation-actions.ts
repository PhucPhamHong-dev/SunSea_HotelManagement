'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Reservation } from '../../lib/api/api-client';

export function useConfirmReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, version }: { reservationId: string; version: number }) => apiClient.reservations.confirm(reservationId, { version }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useCheckInReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, version }: { reservationId: string; version: number }) => apiClient.reservations.checkIn(reservationId, { version }),
    onSuccess: (response, variables) => {
      const nextReservation = response.data.data as unknown as Reservation;
      queryClient.setQueryData<Reservation[]>(['reservations'], (current) => current?.map((reservation) => reservation.id === nextReservation.id ? nextReservation : reservation));
      queryClient.setQueryData(['reservation', variables.reservationId], nextReservation);
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['advance-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['advance-reservation-detail', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservation', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, version, reason }: { reservationId: string; version: number; reason: string }) => apiClient.reservations.cancel(reservationId, { version, reason }),
    onSuccess: (response, variables) => {
      const nextReservation = response.data.data as unknown as Reservation;
      queryClient.setQueryData<Reservation[]>(['reservations'], (current) => current?.map((reservation) => reservation.id === nextReservation.id ? nextReservation : reservation));
      queryClient.setQueryData(['reservation', variables.reservationId], nextReservation);
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['advance-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['advance-reservation-detail', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['payments', variables.reservationId] });
    },
  });
}

export function useCheckoutPreview(reservationId?: string) {
  return useQuery({
    queryKey: ['checkout-preview', reservationId],
    queryFn: async () => (await apiClient.reservations.checkoutPreview(reservationId as string)).data.data,
    enabled: Boolean(reservationId),
    // Live room charges can change at the hotel's daily 17:00 cutoff without
    // a database mutation. Revalidate while the guest remains checked in so
    // the receptionist sees the backend-calculated balance without reload.
    refetchInterval: reservationId ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useCheckoutReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, version }: { reservationId: string; version: number }) => apiClient.reservations.checkOut(reservationId, { version }),
    onSuccess: (response, variables) => {
      const nextReservation = response.data.data as unknown as Reservation;
      queryClient.setQueryData<Reservation[]>(['reservations'], (current) => current?.map((reservation) => reservation.id === nextReservation.id ? nextReservation : reservation));
      queryClient.setQueryData(['reservation', variables.reservationId], nextReservation);
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reservation', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['payments', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservation-services', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['checkout-preview', variables.reservationId] });
    },
  });
}
