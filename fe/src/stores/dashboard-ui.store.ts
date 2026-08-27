import { create } from 'zustand';

export type DashboardSelection =
  | { kind: 'room'; roomId: string; reservationId?: never }
  | { kind: 'advanceReservation'; roomId: string; reservationId: string }
  | { kind: 'activeStay'; roomId: string; reservationId: string };

interface DashboardUiState {
  selectedDate: string;
  selectedFloorId: string | null;
  selectedRoomId: string | null;
  selectedReservationId: string | null;
  selectionKind: DashboardSelection['kind'];
  setSelectedDate: (selectedDate: string) => void;
  setSelectedFloorId: (selectedFloorId: string | null) => void;
  select: (selection: DashboardSelection) => void;
  clearSelection: () => void;
  clearReservation: () => void;
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  selectedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()),
  selectedFloorId: null,
  selectedRoomId: null,
  selectedReservationId: null,
  selectionKind: 'room',
  setSelectedDate: (selectedDate) => set({ selectedDate, selectedReservationId: null, selectionKind: 'room' }),
  setSelectedFloorId: (selectedFloorId) => set({ selectedFloorId }),
  select: (selection) => set({
    selectedRoomId: selection.roomId,
    selectedReservationId: selection.reservationId ?? null,
    selectionKind: selection.kind,
  }),
  clearSelection: () => set({ selectedRoomId: null, selectedReservationId: null, selectionKind: 'room' }),
  clearReservation: () => set({ selectedReservationId: null, selectionKind: 'room' }),
}));
