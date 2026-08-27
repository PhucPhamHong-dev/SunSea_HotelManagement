import { HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { AdvanceReservationContext, AdvanceReservationListItem, AdvanceReservationListQuery, CreateStayInput, CreatedStay, CreatedStayGuest, PaymentSummary, ProcessedNoShow, ReservationDetailsUpdate, ReservationEntity, ReservationInput, ReservationRepository, ReservationStatus } from '../../application/ports/reservation.repository';

interface ReservationRow {
  id: string;
  room_id: string | null;
  preferred_room_id: string | null;
  room_type_id: string;
  guest_id: string;
  planned_check_in_at: string;
  planned_check_out_at: string | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  status: ReservationStatus;
  room_rate_snapshot: number | null;
  deposit_expected: number;
  note: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface RoomContextRow {
  id: string;
  room_number: string;
  floor_id: string;
  default_nightly_rate: number | null;
  housekeeping_status: 'ready' | 'cleaning' | 'out_of_service';
}

interface RoomTypeContextRow { id: string; name: string; }

interface FloorContextRow { id: string; floor_number: number; }
interface GuestContextRow { id: string; full_name: string; phone: string | null; }
interface GuestRow extends GuestContextRow {
  id_number: string | null;
  date_of_birth: string | null;
  id_issued_date: string | null;
  address: string | null;
  note: string | null;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
interface PaymentSummaryRow { reservation_id: string; payment_type: string; amount: number; status: string; }
interface CreateStayRpcResponse { action: 'check_in' | 'advance'; reservation: ReservationRow; guest: GuestRow; }
interface ProcessedNoShowRow { reservation_id: string; room_id: string | null; }

const fields = 'id, room_id, preferred_room_id, room_type_id, guest_id, planned_check_in_at, planned_check_out_at, actual_check_in_at, actual_check_out_at, status, room_rate_snapshot, deposit_expected, note, cancellation_reason, cancelled_at, no_show_at, version, created_at, updated_at';

@Injectable()
export class SupabaseReservationRepository implements ReservationRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string): Promise<ReservationEntity[]> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('reservations').select(fields).order('planned_check_in_at', { ascending: true }).returns<ReservationRow[]>();
    if (error) throw error;
    return (data ?? []).map((row) => this.map(row));
  }

  async markOverdueConfirmedReservations(): Promise<ProcessedNoShow[]> {
    const { data, error } = await this.supabase.getAdminClient().rpc('mark_overdue_confirmed_reservations');
    if (error) throw error;
    return ((data ?? []) as ProcessedNoShowRow[]).map((row) => ({
      reservationId: row.reservation_id,
      roomId: row.room_id,
    }));
  }

  async releaseExpiredDraftReservations(): Promise<ProcessedNoShow[]> {
    const { data, error } = await this.supabase.getAdminClient().rpc('release_expired_draft_reservations');
    if (error) throw error;
    return ((data ?? []) as ProcessedNoShowRow[]).map((row) => ({
      reservationId: row.reservation_id,
      roomId: row.room_id,
    }));
  }

  async findById(accessToken: string, reservationId: string): Promise<ReservationEntity | null> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('reservations').select(fields).eq('id', reservationId).maybeSingle<ReservationRow>();
    if (error) throw error;
    return data ? this.map(data) : null;
  }

  async listAdvance(accessToken: string, query: AdvanceReservationListQuery): Promise<AdvanceReservationListItem[]> {
    const client = this.supabase.getPublicClient(accessToken);
    const reservationQuery = client.from('reservations').select(fields)
      .in('status', ['draft', 'confirmed'])
      .order('planned_check_in_at', { ascending: true });
    const { data: reservations, error: reservationError } = await reservationQuery.returns<ReservationRow[]>();
    if (reservationError) throw reservationError;
    if (!reservations?.length) return [];

    const [{ data: rooms, error: roomsError }, { data: floors, error: floorsError }, { data: guests, error: guestsError }, { data: roomTypes, error: roomTypesError }] = await Promise.all([
      client.from('rooms').select('id, room_number, floor_id, default_nightly_rate, housekeeping_status').returns<RoomContextRow[]>(),
      client.from('floors').select('id, floor_number').returns<FloorContextRow[]>(),
      client.from('guests').select('id, full_name, phone').returns<GuestContextRow[]>(),
      client.from('room_types').select('id, name').returns<RoomTypeContextRow[]>(),
    ]);
    if (roomsError) throw roomsError;
    if (floorsError) throw floorsError;
    if (guestsError) throw guestsError;
    if (roomTypesError) throw roomTypesError;
    const roomById = new Map((rooms ?? []).map((room) => [room.id, room]));
    const floorById = new Map((floors ?? []).map((floor) => [floor.id, floor]));
    const guestById = new Map((guests ?? []).map((guest) => [guest.id, guest]));
    const roomTypeById = new Map((roomTypes ?? []).map((roomType) => [roomType.id, roomType]));
    const windowStart = query.from ? new Date(query.from) : null;
    const windowEnd = query.to ? new Date(query.to) : null;
    const filteredReservations = (reservations ?? []).filter((reservation) => {
      const checkInAt = new Date(reservation.planned_check_in_at);
      const cutoff = reservation.status === 'confirmed' ? this.noShowCutoff(reservation.planned_check_in_at) : null;
      const checkInInWindow = (!windowStart || checkInAt >= windowStart) && (!windowEnd || checkInAt < windowEnd);
      const overdueCheckInInWindow = cutoff !== null
        && (!windowStart || cutoff >= windowStart)
        && (!windowEnd || cutoff < windowEnd);
      const displayRoom = reservation.room_id ? roomById.get(reservation.room_id) : reservation.preferred_room_id ? roomById.get(reservation.preferred_room_id) : undefined;
      return (checkInInWindow || overdueCheckInInWindow) && (!query.floorId || displayRoom?.floor_id === query.floorId);
    });
    const summaries = await this.getPaymentSummaries(client, filteredReservations.map((reservation) => reservation.id));

    return filteredReservations.map((row) => {
      const assignedRoom = row.room_id ? roomById.get(row.room_id) : undefined;
      const preferredRoom = row.preferred_room_id ? roomById.get(row.preferred_room_id) : undefined;
      const displayRoom = assignedRoom ?? preferredRoom;
      const floor = displayRoom ? floorById.get(displayRoom.floor_id) : undefined;
      const guest = guestById.get(row.guest_id);
      return {
        reservationId: row.id,
        status: row.status,
        roomId: row.room_id,
        preferredRoomId: row.preferred_room_id,
        roomNumber: assignedRoom?.room_number ?? null,
        floorId: displayRoom?.floor_id ?? null,
        floorNumber: floor?.floor_number ?? null,
        roomTypeId: row.room_type_id,
        roomTypeName: roomTypeById.get(row.room_type_id)?.name ?? 'Loại phòng',
        guestId: row.guest_id,
        guestName: guest?.full_name ?? '—',
        checkInAt: row.planned_check_in_at,
        checkOutAt: row.planned_check_out_at,
        depositPaidAmount: summaries.get(row.id)?.depositPaidAmount ?? 0,
        currency: 'VND' as const,
        updatedAt: row.updated_at,
      };
    }).sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));
  }

  async getAdvanceContext(accessToken: string, reservationId: string): Promise<AdvanceReservationContext | null> {
    const client = this.supabase.getPublicClient(accessToken);
    const reservation = await this.findById(accessToken, reservationId);
    if (!reservation) return null;
    const [{ data: room, error: roomError }, { data: preferredRoom, error: preferredRoomError }, { data: guest, error: guestError }, { data: roomType, error: roomTypeError }] = await Promise.all([
      reservation.roomId
        ? client.from('rooms').select('id, room_number, floor_id, default_nightly_rate, housekeeping_status').eq('id', reservation.roomId).maybeSingle<RoomContextRow>()
        : Promise.resolve({ data: null, error: null }),
      reservation.preferredRoomId
        ? client.from('rooms').select('id, room_number, floor_id, default_nightly_rate, housekeeping_status').eq('id', reservation.preferredRoomId).maybeSingle<RoomContextRow>()
        : Promise.resolve({ data: null, error: null }),
      client.from('guests').select('id, full_name, phone').eq('id', reservation.guestId).maybeSingle<GuestContextRow>(),
      client.from('room_types').select('id, name').eq('id', reservation.roomTypeId).maybeSingle<RoomTypeContextRow>(),
    ]);
    if (roomError) throw roomError;
    if (preferredRoomError) throw preferredRoomError;
    if (guestError) throw guestError;
    if (roomTypeError) throw roomTypeError;
    if (!guest || !roomType) return null;
    const displayRoom = room ?? preferredRoom;
    const [{ data: floor, error: floorError }, { data: services, error: servicesError }, paymentSummaries] = await Promise.all([
      displayRoom ? client.from('floors').select('id, floor_number').eq('id', displayRoom.floor_id).maybeSingle<FloorContextRow>() : Promise.resolve({ data: null, error: null }),
      client.from('reservation_services').select('total').eq('reservation_id', reservationId).eq('active', true).returns<Array<{ total: number }>>(),
      this.getPaymentSummaries(client, [reservationId]),
    ]);
    if (floorError) throw floorError;
    if (servicesError) throw servicesError;
    const readyAssignment = await client.rpc('room_type_has_ready_assignment', {
      p_room_type_id: reservation.roomTypeId,
      p_reservation_id: reservation.id,
    });
    if (readyAssignment.error) throw readyAssignment.error;
    const paymentSummary: PaymentSummary = paymentSummaries.get(reservationId) ?? { depositPaidAmount: 0, totalPaidAmount: 0 };
    return {
      reservation,
      roomNumber: room?.room_number ?? null,
      preferredRoomNumber: preferredRoom?.room_number ?? null,
      floorId: displayRoom?.floor_id ?? null,
      floorNumber: floor?.floor_number ?? null,
      roomTypeName: roomType.name,
      guestName: guest.full_name,
      contactPhone: guest.phone,
      roomPriceAmount: reservation.roomRateSnapshot ?? room?.default_nightly_rate ?? preferredRoom?.default_nightly_rate ?? 0,
      roomHousekeepingStatus: room?.housekeeping_status ?? null,
      hasReadyAssignment: Boolean(readyAssignment.data),
      serviceTotal: (services ?? []).reduce((sum, service) => sum + service.total, 0),
      paymentSummary,
    };
  }

  async getRoomRate(accessToken: string, roomId: string): Promise<number | null> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('rooms').select('default_nightly_rate').eq('id', roomId).maybeSingle<{ default_nightly_rate: number | null }>();
    if (error) throw error;
    return data?.default_nightly_rate ?? null;
  }

  async createStay(accessToken: string, actorId: string, input: CreateStayInput): Promise<CreatedStay> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc('create_stay_by_room_type', {
      p_room_id: input.roomId,
      p_guest_full_name: input.guest.fullName,
      p_guest_phone: input.guest.phone ?? null,
      p_guest_id_number: input.guest.idNumber ?? null,
      p_guest_date_of_birth: input.guest.dateOfBirth ?? null,
      p_guest_id_issued_date: input.guest.idIssuedDate ?? null,
      p_guest_address: input.guest.address ?? null,
      p_planned_check_in_at: input.plannedCheckInAt,
      p_planned_check_out_at: input.plannedCheckOutAt,
      p_mode: input.action,
      p_assignment_mode: input.assignmentMode ?? 'exact',
      p_room_rate_per_night: input.roomRatePerNight,
      p_deposit_amount: input.depositAmount ?? 0,
      p_note: input.note ?? null,
      p_actor_id: actorId,
    }).maybeSingle<CreateStayRpcResponse>();
    if (error) throw this.translateDatabaseError(error);
    if (!data) throw new ApplicationError(ErrorCode.INTERNAL_ERROR, 'Stay creation returned no data', HttpStatus.INTERNAL_SERVER_ERROR);
    return { action: data.action, reservation: this.map(data.reservation), guest: this.mapCreatedGuest(data.guest) };
  }

  async create(accessToken: string, actorId: string, input: ReservationInput, roomRateSnapshot: number | null): Promise<ReservationEntity> {
    if (!input.roomId) throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Room is required for a direct reservation create', HttpStatus.BAD_REQUEST);
    const { data: room, error: roomError } = await this.supabase.getPublicClient(accessToken)
      .from('rooms').select('room_type_id').eq('id', input.roomId).maybeSingle<{ room_type_id: string }>();
    if (roomError) throw roomError;
    if (!room) throw new ApplicationError(ErrorCode.ROOM_NOT_FOUND, 'Room was not found', HttpStatus.NOT_FOUND);
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('reservations').insert({
      room_id: input.roomId,
      preferred_room_id: input.roomId,
      room_type_id: room.room_type_id,
      guest_id: input.guestId,
      planned_check_in_at: input.plannedCheckInAt,
      planned_check_out_at: input.plannedCheckOutAt,
      room_rate_snapshot: roomRateSnapshot,
      deposit_expected: input.depositExpected ?? 0,
      note: input.note ?? null,
      created_by: actorId,
      updated_by: actorId,
    }).select(fields).single<ReservationRow>();
    if (error || !data) throw this.translateDatabaseError(error);
    return this.map(data);
  }

  async updateDetails(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, input: ReservationDetailsUpdate): Promise<ReservationEntity> {
    const patch: Record<string, unknown> = { version: expectedVersion + 1, updated_by: actorId };
    if (input.plannedCheckInAt !== undefined) patch.planned_check_in_at = input.plannedCheckInAt;
    if (input.plannedCheckOutAt !== undefined) patch.planned_check_out_at = input.plannedCheckOutAt;
    if (input.note !== undefined) patch.note = input.note?.trim() || null;
    const { data, error } = await this.supabase.getPublicClient(accessToken)
      .from('reservations')
      .update(patch)
      .eq('id', reservationId)
      .eq('version', expectedVersion)
      .select(fields)
      .maybeSingle<ReservationRow>();
    if (error) throw this.translateDatabaseError(error);
    if (!data) throw new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
    return this.map(data);
  }

  async updateOpenStayCheckout(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, input: ReservationDetailsUpdate): Promise<ReservationEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc('update_open_stay_checkout', {
      p_reservation_id: reservationId,
      p_expected_version: expectedVersion,
      p_planned_check_out_at: input.plannedCheckOutAt ?? null,
      p_update_note: input.note !== undefined,
      p_note: input.note ?? null,
      p_actor_id: actorId,
    }).maybeSingle<ReservationRow>();
    if (error) throw this.translateDatabaseError(error);
    if (!data) throw new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
    return this.map(data);
  }

  async updateStatus(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, status: ReservationStatus, reason?: string): Promise<ReservationEntity> {
    if (status === 'checked_in') return this.runTransactionalStatusOperation(accessToken, reservationId, expectedVersion, actorId, 'check_in_reservation');
    if (status === 'cancelled') return this.runTransactionalStatusOperation(accessToken, reservationId, expectedVersion, actorId, 'cancel_reservation', reason);
    const patch: Record<string, unknown> = { status, version: expectedVersion + 1, updated_by: actorId };
    if (status === 'no_show') {
      patch.no_show_at = new Date().toISOString();
      patch.no_show_by = actorId;
    }
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('reservations').update(patch).eq('id', reservationId).eq('version', expectedVersion).select(fields).maybeSingle<ReservationRow>();
    if (error) throw this.translateDatabaseError(error);
    if (!data) throw new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
    return this.map(data);
  }

  private async runTransactionalStatusOperation(
    accessToken: string,
    reservationId: string,
    expectedVersion: number,
    actorId: string,
    operation: 'check_in_reservation' | 'cancel_reservation',
    reason?: string,
  ): Promise<ReservationEntity> {
    const args = operation === 'check_in_reservation'
      ? { p_reservation_id: reservationId, p_expected_version: expectedVersion, p_actor_id: actorId }
      : { p_reservation_id: reservationId, p_expected_version: expectedVersion, p_actor_id: actorId, p_reason: reason };
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc(operation, args).maybeSingle<ReservationRow>();
    if (error) {
      if (error.code === '40001' || error.message?.toLowerCase().includes('changed by another user')) {
        throw new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
      }
      throw this.translateDatabaseError(error);
    }
    if (!data) throw new ApplicationError(ErrorCode.RESERVATION_NOT_FOUND, 'Reservation was not found', HttpStatus.NOT_FOUND);
    return this.map(data);
  }

  async checkout(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, settlementAmount: number): Promise<ReservationEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc('checkout_and_settle_reservation', {
      p_reservation_id: reservationId,
      p_expected_version: expectedVersion,
      p_settlement_amount: settlementAmount,
      p_actor_id: actorId,
    }).maybeSingle<ReservationRow>();
    if (error) throw this.translateDatabaseError(error);
    if (!data) throw new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
    return this.map(data);
  }

  async getFinancials(accessToken: string, reservationId: string): Promise<{ serviceTotal: number; paidAmount: number }> {
    const client = this.supabase.getPublicClient(accessToken);
    const [{ data: services, error: servicesError }, { data: payments, error: paymentsError }] = await Promise.all([
      client.from('reservation_services').select('total').eq('reservation_id', reservationId).eq('active', true).returns<Array<{ total: number }>>(),
      client.from('payments').select('amount, payment_type, status').eq('reservation_id', reservationId).returns<Array<{ amount: number; payment_type: string; status: string }>>(),
    ]);
    if (servicesError) throw servicesError;
    if (paymentsError) throw paymentsError;
    const serviceTotal = (services ?? []).reduce((sum, item) => sum + item.total, 0);
    const paidAmount = (payments ?? []).reduce((sum, item) => this.paymentDelta(item.payment_type, item.amount, item.status) + sum, 0);
    return { serviceTotal, paidAmount };
  }

  private async getPaymentSummaries(client: ReturnType<SupabaseService['getPublicClient']>, reservationIds: string[]): Promise<Map<string, PaymentSummary>> {
    const summaries = new Map<string, PaymentSummary>();
    if (!reservationIds.length) return summaries;
    const { data, error } = await client.from('payments')
      .select('reservation_id, payment_type, amount, status')
      .in('reservation_id', reservationIds)
      .returns<PaymentSummaryRow[]>();
    if (error) throw error;
    for (const row of data ?? []) {
      const summary = summaries.get(row.reservation_id) ?? { depositPaidAmount: 0, totalPaidAmount: 0 };
      const delta = this.paymentDelta(row.payment_type, row.amount, row.status);
      summary.totalPaidAmount += delta;
      if (row.payment_type === 'deposit') summary.depositPaidAmount += delta;
      if (row.payment_type === 'refund' && row.status === 'completed') summary.depositPaidAmount -= row.amount;
      summaries.set(row.reservation_id, summary);
    }
    for (const summary of summaries.values()) summary.depositPaidAmount = Math.max(0, summary.depositPaidAmount);
    return summaries;
  }

  private paymentDelta(paymentType: string, amount: number, status: string): number {
    if (status !== 'completed') return 0;
    return paymentType === 'refund' ? -amount : amount;
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

  private map(row: ReservationRow): ReservationEntity {
    return {
      id: row.id,
      roomId: row.room_id,
      roomTypeId: row.room_type_id,
      preferredRoomId: row.preferred_room_id,
      guestId: row.guest_id,
      plannedCheckInAt: row.planned_check_in_at,
      plannedCheckOutAt: row.planned_check_out_at,
      actualCheckInAt: row.actual_check_in_at,
      actualCheckOutAt: row.actual_check_out_at,
      status: row.status,
      roomRateSnapshot: row.room_rate_snapshot,
      depositExpected: row.deposit_expected,
      note: row.note ?? undefined,
      cancellationReason: row.cancellation_reason,
      cancelledAt: row.cancelled_at,
      noShowAt: row.no_show_at,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCreatedGuest(row: GuestRow): CreatedStayGuest {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone ?? undefined,
      idNumber: row.id_number ?? undefined,
      dateOfBirth: row.date_of_birth ?? undefined,
      idIssuedDate: row.id_issued_date ?? undefined,
      address: row.address ?? undefined,
      note: row.note ?? undefined,
      active: row.active,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private translateDatabaseError(error: { code?: string; message?: string } | null): ApplicationError {
    if (error?.code === '23P01' || error?.message?.toLowerCase().includes('reservations_no_overlap')) {
      return new ApplicationError(ErrorCode.RESERVATION_CONFLICT, 'Room is already reserved for the selected period', HttpStatus.CONFLICT);
    }
    if (error?.code === '40001' || error?.message?.toLowerCase().includes('changed by another user') || error?.message?.toLowerCase().includes('checkout bill changed')) {
      return new ApplicationError(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, 'Reservation was changed by another user', HttpStatus.CONFLICT);
    }
    if (error?.code === 'P0002' || error?.message?.toLowerCase().includes('reservation was not found')) {
      return new ApplicationError(ErrorCode.RESERVATION_NOT_FOUND, 'Reservation was not found', HttpStatus.NOT_FOUND);
    }
    if (error?.message?.toLowerCase().includes('cannot be checked in') || error?.message?.toLowerCase().includes('cannot be cancelled') || error?.message?.toLowerCase().includes('only checked-in reservations')) {
      return new ApplicationError(ErrorCode.INVALID_RESERVATION_TRANSITION, error.message, HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('cancellation reason is required')) {
      return new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Cancellation reason is required', HttpStatus.BAD_REQUEST);
    }
    if (error?.message?.toLowerCase().includes('check-in is only available') || error?.message?.toLowerCase().includes('advance reservation') || error?.message?.toLowerCase().includes('unsupported intake action')) {
      return new ApplicationError(ErrorCode.INTAKE_ACTION_NOT_AVAILABLE, error.message ?? 'Intake action is not available', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('guest name is required') || error?.message?.toLowerCase().includes('check-out must be after')) {
      return new ApplicationError(ErrorCode.VALIDATION_ERROR, error.message ?? 'Invalid stay information', HttpStatus.BAD_REQUEST);
    }
    if (error?.message?.toLowerCase().includes('room is out of service')) {
      return new ApplicationError(ErrorCode.ROOM_NOT_FOUND, 'Room is out of service', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('room is not ready')) {
      return new ApplicationError(ErrorCode.ROOM_NOT_READY, 'Phòng chưa sẵn sàng để nhận khách.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('no equivalent room is available')) {
      return new ApplicationError(ErrorCode.RESERVATION_CONFLICT, 'Không có phòng tương đương để chuyển đặt phòng bị ảnh hưởng.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('no matching room type inventory')) {
      return new ApplicationError(ErrorCode.ROOM_TYPE_UNAVAILABLE, 'Loại phòng này đã hết chỗ trong khoảng ngày được chọn.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('no ready matching room')) {
      return new ApplicationError(ErrorCode.ROOM_ASSIGNMENT_PENDING, 'Chưa có phòng cùng loại sẵn sàng để nhận khách.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('requires staff decision')) {
      return new ApplicationError(ErrorCode.RESERVATION_CONFLICT, 'Gia hạn bị xung đột với đặt phòng cùng loại; cần xử lý thủ công.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('turnover is pending')) {
      return new ApplicationError(ErrorCode.ROOM_TURNOVER_PENDING, 'Phòng cần hoàn tất trả phòng và dọn trước khi tạo lượt kế tiếp.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('occupied until checkout') || error?.message?.toLowerCase().includes('occupied beyond the requested')) {
      return new ApplicationError(ErrorCode.ROOM_TURNOVER_PENDING, 'Phòng đang có khách lưu trú và chỉ mở lại sau khi trả phòng thực tế.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('before the planned check-in date')) {
      return new ApplicationError(ErrorCode.CHECK_IN_BEFORE_PLANNED_DATE, 'Chỉ có thể nhận phòng từ ngày nhận dự kiến.', HttpStatus.CONFLICT);
    }
    if (error?.message?.toLowerCase().includes('refund is required before checkout')) {
      return new ApplicationError(ErrorCode.CHECKOUT_REFUND_REQUIRED, 'Cần xử lý khoản hoàn tiền trước khi trả phòng.', HttpStatus.CONFLICT);
    }
    return new ApplicationError(ErrorCode.INTERNAL_ERROR, error?.message ?? 'Database operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
