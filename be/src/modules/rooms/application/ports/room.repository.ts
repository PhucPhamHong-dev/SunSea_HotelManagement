import type { RoomEntity } from '../../domain/entities/room.entity';

export interface RoomInput {
  floorId: string;
  roomNumber: string;
  bedCount: number;
  hasWindow?: boolean;
  defaultNightlyRate?: number | null;
  layoutKey?: string;
}

export interface RoomRepository {
  list(accessToken: string, floorId?: string, checkInAt?: string, checkOutAt?: string): Promise<RoomEntity[]>;
  listStatusByDate(accessToken: string, floorId: string | undefined, date: string): Promise<RoomEntity[]>;
  findById(accessToken: string, roomId: string): Promise<RoomEntity | null>;
  create(accessToken: string, actorId: string, input: RoomInput): Promise<RoomEntity>;
  update(accessToken: string, actorId: string, roomId: string, input: Partial<RoomInput>): Promise<RoomEntity>;
  updateRate(accessToken: string, actorId: string, roomId: string, rate: number | null): Promise<RoomEntity>;
  updateHousekeeping(accessToken: string, actorId: string, roomId: string, status: 'ready' | 'cleaning' | 'out_of_service'): Promise<RoomEntity>;
  findEquivalentRooms(accessToken: string, roomId: string, checkInAt: string, checkOutAt?: string | null): Promise<EquivalentRoomSearch>;
}

export interface EquivalentRoomSearch {
  requestedRoom: RoomEntity;
  isRequestedRoomAvailable: boolean;
  roomTypeId: string;
  roomTypeName: string;
  availableRoomCount: number;
  canReserveRoomType: boolean;
  alternatives: RoomEntity[];
}
