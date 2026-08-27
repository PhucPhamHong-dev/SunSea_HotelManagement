export type HousekeepingStatus = 'ready' | 'cleaning' | 'out_of_service';
export type RoomDisplayStatus = 'available' | 'occupied' | 'cleaning' | 'reserved' | 'out_of_service';

export interface RoomEntity {
  id: string;
  floorId: string;
  roomTypeId: string;
  roomTypeName: string;
  roomNumber: string;
  bedCount: number;
  hasWindow: boolean;
  defaultNightlyRate: number | null;
  layoutKey: string;
  housekeepingStatus: HousekeepingStatus;
  status: RoomDisplayStatus;
  reservationId: string | null;
  canCreateStay: boolean;
  canCreateAdvance: boolean;
  unavailableReason: string | null;
  updatedAt: string;
  active: boolean;
}
