'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '../../lib/websocket/realtime-client';

export function useDashboardRealtime(reservationId?: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const socket = getRealtimeSocket();
    const invalidateRooms = () => { void queryClient.invalidateQueries({ queryKey: ['rooms'] }); };
    const invalidateReservations = () => { void queryClient.invalidateQueries({ queryKey: ['reservations'] }); };
    const invalidateReservation = () => {
      if (reservationId) {
        void queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
        void queryClient.invalidateQueries({ queryKey: ['reservation-services', reservationId] });
        void queryClient.invalidateQueries({ queryKey: ['payments', reservationId] });
        void queryClient.invalidateQueries({ queryKey: ['advance-reservation-detail', reservationId] });
        void queryClient.invalidateQueries({ queryKey: ['checkout-preview', reservationId] });
      }
      invalidateReservations();
      void queryClient.invalidateQueries({ queryKey: ['advance-reservations'] });
    };

    socket.on('room.status.updated', invalidateRooms);
    socket.on('reservation.created', invalidateReservation);
    socket.on('reservation.updated', invalidateReservation);
    socket.on('reservation.cancelled', invalidateReservation);
    socket.on('reservation.checked_in', invalidateReservation);
    socket.on('reservation.checked_out', invalidateReservation);
    socket.on('reservation.no_show', invalidateReservation);
    socket.on('service.added', invalidateReservation);
    socket.on('service.updated', invalidateReservation);
    socket.on('payment.created', invalidateReservation);
    socket.on('payment.updated', invalidateReservation);
    socket.on('payment.voided', invalidateReservation);
    return () => {
      socket.off('room.status.updated', invalidateRooms);
      socket.off('reservation.created', invalidateReservation);
      socket.off('reservation.updated', invalidateReservation);
      socket.off('reservation.cancelled', invalidateReservation);
      socket.off('reservation.checked_in', invalidateReservation);
      socket.off('reservation.checked_out', invalidateReservation);
      socket.off('reservation.no_show', invalidateReservation);
      socket.off('service.added', invalidateReservation);
      socket.off('service.updated', invalidateReservation);
      socket.off('payment.created', invalidateReservation);
      socket.off('payment.updated', invalidateReservation);
      socket.off('payment.voided', invalidateReservation);
    };
  }, [enabled, queryClient, reservationId]);
}
