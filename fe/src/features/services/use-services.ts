'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type AddReservationServiceDto, type ReservationService, type UpdateReservationServiceDto } from '../../lib/api/api-client';

export function useServiceCatalog(enabled = true) {
  return useQuery({
    queryKey: ['service-catalog'],
    queryFn: async () => (await apiClient.services.catalog()).data.data,
    enabled,
  });
}

export function useReservationServices(reservationId?: string) {
  return useQuery({
    queryKey: ['reservation-services', reservationId],
    queryFn: async () => (await apiClient.services.byReservation(reservationId as string)).data.data,
    enabled: Boolean(reservationId),
  });
}

export function useAddReservationService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, body }: { reservationId: string; body: AddReservationServiceDto }) => apiClient.services.add(reservationId, body),
    onSuccess: (response, variables) => {
      const created = response.data.data;
      queryClient.setQueryData<ReservationService[]>(['reservation-services', variables.reservationId], (current) => {
        if (current?.some((service) => service.id === created.id)) return current;
        return [...(current ?? []), created];
      });
      void queryClient.invalidateQueries({ queryKey: ['reservation-services', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservation', variables.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['checkout-preview', variables.reservationId] });
    },
  });
}

export function useUpdateReservationService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, body }: { serviceId: string; body: UpdateReservationServiceDto }) => apiClient.services.update(serviceId, body),
    onSuccess: (response) => {
      const updated = response.data.data;
      queryClient.setQueryData<ReservationService[]>(['reservation-services', updated.reservationId], (current) => current?.map((service) => service.id === updated.id ? updated : service));
      void queryClient.invalidateQueries({ queryKey: ['reservation-services', updated.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservation', updated.reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['checkout-preview', updated.reservationId] });
    },
  });
}
