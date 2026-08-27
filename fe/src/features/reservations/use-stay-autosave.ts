'use client';

import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api/api-error';
import { apiClient, type Guest, type Reservation, type UpdateGuestDto, type UpdateReservationDto } from '../../lib/api/api-client';

export type GuestPatch = Pick<UpdateGuestDto, 'fullName' | 'idNumber' | 'dateOfBirth' | 'idIssuedDate' | 'address'>;
export type ReservationPatch = Pick<UpdateReservationDto, 'plannedCheckInAt' | 'plannedCheckOutAt' | 'note'>;

interface AutosaveOptions {
  onError?: (error: unknown) => void;
}

export function useStayAutosave(options: AutosaveOptions = {}) {
  const queryClient = useQueryClient();
  const guestQueues = useRef(new Map<string, Promise<Guest>>());
  const reservationQueues = useRef(new Map<string, Promise<Reservation>>());

  const saveGuest = (guestId: string, patch: GuestPatch): Promise<Guest> => {
    const previous = guestQueues.current.get(guestId);
    const task = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(async () => {
      try {
        const response = await apiClient.guests.update(guestId, patch);
        const guest = response.data.data;
        queryClient.setQueryData<Guest[]>(['guests'], (current) => current?.map((item) => item.id === guest.id ? guest : item));
        void queryClient.invalidateQueries({ queryKey: ['guests'] });
        return guest;
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    });
    guestQueues.current.set(guestId, task);
    void task.then(() => undefined, () => undefined).finally(() => {
      if (guestQueues.current.get(guestId) === task) guestQueues.current.delete(guestId);
    });
    return task;
  };

  const saveReservation = (reservationId: string, version: number, patch: ReservationPatch): Promise<Reservation> => {
    const previous = reservationQueues.current.get(reservationId);
    const task = (previous ? previous.then((reservation) => reservation.version, () => version) : Promise.resolve(version)).then(async (nextVersion) => {
      try {
        const response = await apiClient.reservations.updateDetails(reservationId, { version: nextVersion, ...patch });
        const reservation = response.data.data;
        queryClient.setQueryData<Reservation[]>(['reservations'], (current) => current?.map((item) => item.id === reservation.id ? reservation : item));
        queryClient.setQueryData(['reservation', reservation.id], reservation);
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        void queryClient.invalidateQueries({ queryKey: ['rooms'] });
        void queryClient.invalidateQueries({ queryKey: ['checkout-preview', reservation.id] });
        return reservation;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          await queryClient.invalidateQueries({ queryKey: ['reservations'] });
          await queryClient.invalidateQueries({ queryKey: ['guests'] });
        }
        options.onError?.(error);
        throw error;
      }
    });
    reservationQueues.current.set(reservationId, task);
    void task.then(() => undefined, () => undefined).finally(() => {
      if (reservationQueues.current.get(reservationId) === task) reservationQueues.current.delete(reservationId);
    });
    return task;
  };

  return { saveGuest, saveReservation };
}
