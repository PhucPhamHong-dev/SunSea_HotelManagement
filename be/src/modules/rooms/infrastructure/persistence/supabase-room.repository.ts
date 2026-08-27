import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import type { EquivalentRoomSearch, RoomInput, RoomRepository } from '../../application/ports/room.repository';
import type { HousekeepingStatus, RoomEntity, RoomDisplayStatus } from '../../domain/entities/room.entity';

interface RoomRow {
  id: string;
  floor_id: string;
  room_type_id: string;
  room_number: string;
  bed_count: number;
  has_window: boolean;
  default_nightly_rate: number | null;
  layout_key: string;
  housekeeping_status: HousekeepingStatus;
  updated_at: string;
  active: boolean;
}

interface RoomTypeRow { id: string; name: string; }

interface ReservationStatusRow {
  id: string;
  room_id: string | null;
  room_type_id: string;
  status: 'draft' | 'confirmed' | 'checked_in';
  planned_check_in_at: string;
  planned_check_out_at: string | null;
}

@Injectable()
export class SupabaseRoomRepository implements RoomRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string, floorId?: string, checkInAt?: string, checkOutAt?: string): Promise<RoomEntity[]> {
    const client = this.supabase.getPublicClient(accessToken);
    let query = this.supabase
      .getPublicClient(accessToken)
      .from('rooms')
      .select('id, floor_id, room_type_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, housekeeping_status, updated_at, active')
      .order('room_number', { ascending: true });
    if (floorId) query = query.eq('floor_id', floorId);
    const { data, error } = await query.returns<RoomRow[]>();
    if (error) throw error;
    const [reservations, roomTypes] = await Promise.all([this.activeReservations(client, checkInAt, checkOutAt), this.listRoomTypes(client)]);
    return (data ?? []).map((row) => this.map(row, reservations, roomTypes, !checkInAt || !this.isFutureBusinessDate(checkInAt)));
  }

  async listStatusByDate(accessToken: string, floorId: string | undefined, date: string): Promise<RoomEntity[]> {
    const start = new Date(`${date}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 86_400_000);
    return this.list(accessToken, floorId, start.toISOString(), end.toISOString());
  }

  async findById(accessToken: string, roomId: string): Promise<RoomEntity | null> {
    const client = this.supabase.getPublicClient(accessToken);
    const { data, error } = await this.supabase
      .getPublicClient(accessToken)
      .from('rooms')
      .select('id, floor_id, room_type_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, housekeeping_status, updated_at, active')
      .eq('id', roomId)
      .maybeSingle<RoomRow>();
    if (error) throw error;
    if (!data) return null;
    const [reservations, roomTypes] = await Promise.all([this.activeReservations(client), this.listRoomTypes(client)]);
    return this.map(data, reservations, roomTypes, true);
  }

  async create(accessToken: string, actorId: string, input: RoomInput): Promise<RoomEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('rooms').insert({
      floor_id: input.floorId,
      room_number: input.roomNumber,
      bed_count: input.bedCount,
      default_nightly_rate: input.defaultNightlyRate ?? null,
      layout_key: input.layoutKey ?? 'standard',
      created_by: actorId,
      updated_by: actorId,
      has_window: input.hasWindow ?? false,
    }).select('id, floor_id, room_type_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, housekeeping_status, updated_at, active').single<RoomRow>();
    if (error || !data) throw error ?? new Error('Room insert returned no data');
    return this.map(data, [], await this.listRoomTypes(this.supabase.getPublicClient(accessToken)), true);
  }

  async update(accessToken: string, actorId: string, roomId: string, input: Partial<RoomInput>): Promise<RoomEntity> {
    const patch: Record<string, unknown> = { updated_by: actorId };
    if (input.floorId !== undefined) patch.floor_id = input.floorId;
    if (input.roomNumber !== undefined) patch.room_number = input.roomNumber;
    if (input.bedCount !== undefined) patch.bed_count = input.bedCount;
    if (input.hasWindow !== undefined) patch.has_window = input.hasWindow;
    if (input.defaultNightlyRate !== undefined) patch.default_nightly_rate = input.defaultNightlyRate;
    if (input.layoutKey !== undefined) patch.layout_key = input.layoutKey;
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('rooms').update(patch).eq('id', roomId).select('id, floor_id, room_type_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, housekeeping_status, updated_at, active').single<RoomRow>();
    if (error || !data) throw error ?? new Error('Room update returned no data');
    return this.map(data, [], await this.listRoomTypes(this.supabase.getPublicClient(accessToken)), true);
  }

  updateRate(accessToken: string, actorId: string, roomId: string, rate: number | null): Promise<RoomEntity> {
    return this.update(accessToken, actorId, roomId, { defaultNightlyRate: rate });
  }

  async updateHousekeeping(accessToken: string, actorId: string, roomId: string, status: HousekeepingStatus): Promise<RoomEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc('set_room_housekeeping_status', {
      p_room_id: roomId,
      p_status: status,
      p_actor_id: actorId,
    }).maybeSingle<RoomRow>();
    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('turnover is pending') || message.includes('awaiting housekeeping completion')) {
        throw new ApplicationError(ErrorCode.ROOM_TURNOVER_PENDING, 'Phòng chưa ở trạng thái có thể xác nhận dọn xong.', 409);
      }
      if (error.code === 'P0002' || message.includes('room was not found')) {
        throw new ApplicationError(ErrorCode.ROOM_NOT_FOUND, 'Room was not found', 404);
      }
      throw error;
    }
    if (!data) throw new Error('Housekeeping update returned no data');
    return this.map(data, [], await this.listRoomTypes(this.supabase.getPublicClient(accessToken)), true);
  }

  async findEquivalentRooms(accessToken: string, roomId: string, checkInAt: string, checkOutAt?: string | null): Promise<EquivalentRoomSearch> {
    const start = new Date(checkInAt);
    const end = checkOutAt ? new Date(checkOutAt) : null;
    if (Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end <= start))) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Check-out must be after check-in', 400);
    }

    const client = this.supabase.getPublicClient(accessToken);
    const [{ data: rooms, error: roomsError }, reservations, roomTypes] = await Promise.all([
      client.from('rooms').select('id, floor_id, room_type_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, housekeeping_status, updated_at, active').order('room_number', { ascending: true }).returns<RoomRow[]>(),
      this.activeReservations(client, checkInAt, checkOutAt),
      this.listRoomTypes(client),
    ]);
    if (roomsError) throw roomsError;
    const requested = (rooms ?? []).find((room) => room.id === roomId);
    if (!requested) throw new ApplicationError(ErrorCode.ROOM_NOT_FOUND, 'Room was not found', 404);

    const requiresReadyNow = !this.isFutureBusinessDate(checkInAt);
    const isAvailable = (room: RoomRow) => room.active
      && (!requiresReadyNow || room.housekeeping_status === 'ready')
      && !reservations.some((reservation) => reservation.room_id === room.id);
    const roomTypeName = roomTypes.get(requested.room_type_id) ?? `${requested.bed_count} giường`;
    const roomTypeCount = await client.rpc('room_type_committed_count', {
      p_room_type_id: requested.room_type_id,
      p_start: checkInAt,
      p_end: checkOutAt ?? null,
      p_exclude_reservation_id: null,
    });
    const roomTypeInventory = await client.rpc('room_type_active_inventory', { p_room_type_id: requested.room_type_id });
    if (roomTypeCount.error) throw roomTypeCount.error;
    if (roomTypeInventory.error) throw roomTypeInventory.error;
    const availableRoomCount = Math.max(0, Number(roomTypeInventory.data ?? 0) - Number(roomTypeCount.data ?? 0));
    const requestedRoom = this.map(requested, reservations.filter((reservation) => reservation.room_id === requested.id), roomTypes, !this.isFutureBusinessDate(checkInAt));
    const alternatives = (rooms ?? [])
      .filter((room) => room.id !== requested.id)
      .filter((room) => room.bed_count === requested.bed_count && room.has_window === requested.has_window)
      .filter(isAvailable)
      .sort((left, right) => {
        const leftFloorRank = left.floor_id === requested.floor_id ? 0 : 1;
        const rightFloorRank = right.floor_id === requested.floor_id ? 0 : 1;
        return leftFloorRank - rightFloorRank || left.room_number.localeCompare(right.room_number, 'en', { numeric: true });
      })
      .map((room) => this.map(room, [], roomTypes, !this.isFutureBusinessDate(checkInAt)));

    return {
      requestedRoom,
      isRequestedRoomAvailable: isAvailable(requested),
      roomTypeId: requested.room_type_id,
      roomTypeName,
      availableRoomCount,
      canReserveRoomType: availableRoomCount > 0,
      alternatives,
    };
  }

  private async activeReservations(client: ReturnType<SupabaseService['getPublicClient']>, checkInAt?: string, checkOutAt?: string | null): Promise<ReservationStatusRow[]> {
    const now = new Date();
    const rangeStart = checkInAt ? new Date(checkInAt) : now;
    const rangeEnd = checkInAt ? (checkOutAt ? new Date(checkOutAt) : null) : new Date(now.getTime() + 1);
    const { data, error } = await client
      .from('reservations')
      .select('id, room_id, room_type_id, status, planned_check_in_at, planned_check_out_at')
      .in('status', ['draft', 'confirmed', 'checked_in'])
      .returns<ReservationStatusRow[]>();
    if (error) throw error;
    return (data ?? []).filter((reservation) => this.overlapsInterval(
        new Date(reservation.planned_check_in_at),
        // A planned checkout is only an estimate while the guest is still
        // checked in. Operationally the room remains occupied until the
        // checkout transaction changes the reservation status, even when the
        // estimate has already passed. A confirmed booking stays held at
        // least until its automatic no-show cutoff on the following day.
        reservation.status === 'checked_in'
          ? (this.isFutureBusinessDate(checkInAt) && reservation.planned_check_out_at ? new Date(reservation.planned_check_out_at) : null)
          : reservation.status === 'confirmed'
            ? this.confirmedReservationEnd(reservation)
            : reservation.planned_check_out_at
              ? new Date(reservation.planned_check_out_at)
              : null,
        rangeStart,
        rangeEnd,
      ));
  }

  private confirmedReservationEnd(reservation: ReservationStatusRow): Date {
    const cutoff = this.noShowCutoff(reservation.planned_check_in_at);
    const plannedCheckout = reservation.planned_check_out_at ? new Date(reservation.planned_check_out_at) : null;
    return plannedCheckout && plannedCheckout > cutoff ? plannedCheckout : cutoff;
  }

  private noShowCutoff(plannedCheckInAt: string): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(plannedCheckInAt)).reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    const nextBusinessDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1));
    const year = nextBusinessDate.getUTCFullYear();
    const month = String(nextBusinessDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nextBusinessDate.getUTCDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T12:00:00+07:00`);
  }

  private overlapsInterval(start: Date, end: Date | null, requestedStart: Date, requestedEnd: Date | null): boolean {
    return start.getTime() < (requestedEnd?.getTime() ?? Number.POSITIVE_INFINITY)
      && requestedStart.getTime() < (end?.getTime() ?? Number.POSITIVE_INFINITY);
  }

  private async listRoomTypes(client: ReturnType<SupabaseService['getPublicClient']>): Promise<Map<string, string>> {
    const { data, error } = await client.from('room_types').select('id, name').returns<RoomTypeRow[]>();
    if (error) throw error;
    return new Map((data ?? []).map((roomType) => [roomType.id, roomType.name]));
  }

  private isFutureBusinessDate(instant?: string): boolean {
    if (!instant) return false;
    const localDate = (value: Date) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
    return localDate(new Date(instant)) > localDate(new Date());
  }

  private map(row: RoomRow, reservations: ReservationStatusRow[], roomTypes: Map<string, string>, includeHousekeeping: boolean): RoomEntity {
    const roomReservations = reservations.filter((reservation) => reservation.room_id === row.id);
    const displayStatus = this.resolveStatus(includeHousekeeping ? row.housekeeping_status : 'ready', roomReservations);
    return {
      id: row.id,
      floorId: row.floor_id,
      roomTypeId: row.room_type_id,
      roomTypeName: roomTypes.get(row.room_type_id) ?? `${row.bed_count} giường`,
      roomNumber: row.room_number,
      bedCount: row.bed_count,
      hasWindow: row.has_window,
      defaultNightlyRate: row.default_nightly_rate,
      layoutKey: row.layout_key,
      housekeepingStatus: row.housekeeping_status,
      status: displayStatus,
      reservationId: this.reservationIdForDisplay(roomReservations),
      canCreateStay: row.active && displayStatus === 'available',
      canCreateAdvance: row.active && displayStatus === 'available',
      unavailableReason: this.unavailableReason({ ...row, housekeeping_status: includeHousekeeping ? row.housekeeping_status : 'ready' }, displayStatus),
      updatedAt: row.updated_at,
      active: row.active,
    };
  }

  private resolveStatus(
    housekeepingStatus: HousekeepingStatus,
    reservations: ReservationStatusRow[],
  ): RoomDisplayStatus {
    if (housekeepingStatus === 'out_of_service') return 'out_of_service';
    if (reservations.some((reservation) => reservation.status === 'checked_in')) return 'occupied';
    if (housekeepingStatus === 'cleaning') return 'cleaning';
    if (reservations.some((reservation) => ['draft', 'confirmed'].includes(reservation.status))) return 'reserved';
    return 'available';
  }

  private reservationIdForDisplay(reservations: ReservationStatusRow[]): string | null {
    return reservations.find((reservation) => reservation.status === 'checked_in')?.id
      ?? reservations.find((reservation) => ['draft', 'confirmed'].includes(reservation.status))?.id
      ?? null;
  }

  private unavailableReason(row: RoomRow, status: RoomDisplayStatus): string | null {
    if (!row.active) return 'Phòng đã ngừng hoạt động.';
    if (status === 'out_of_service') return 'Phòng đang ngưng phục vụ.';
    if (status === 'occupied') return 'Phòng đang có khách lưu trú.';
    if (status === 'cleaning') return 'Phòng đang dọn, cần xác nhận đã dọn xong.';
    if (status === 'reserved') return 'Phòng đã được giữ cho một đặt phòng.';
    return null;
  }
}
