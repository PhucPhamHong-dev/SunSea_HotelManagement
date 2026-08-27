import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import { PricingEngineService } from '../../../pricing/application/services/pricing-engine.service';
import type { PricingResult } from '../../../pricing/domain/pricing.types';
import type { AdvanceReservationListQuery, CreateStayInput, ReservationDetailsUpdate, ReservationEntity, ReservationInput, ReservationRepository, ReservationStatus } from '../ports/reservation.repository';

const SYSTEM_TIMEZONE = 'Asia/Ho_Chi_Minh';

@Injectable()
export class ReservationService {
  constructor(
    @Inject('ReservationRepository') private readonly repository: ReservationRepository,
    private readonly pricing: PricingEngineService,
  ) {}

  list(accessToken: string) {
    return this.repository.list(accessToken);
  }

  listAdvance(accessToken: string, query: AdvanceReservationListQuery) {
    return this.repository.listAdvance(accessToken, query);
  }

  getIntakePolicy(date: string) {
    const now = new Date();
    const current = this.localDateTime(now);
    const dateIsToday = date === current.date;
    const dateIsFuture = date > current.date;
    const beforeNoon = current.hour < 12;
    const allowCheckIn = dateIsToday;
    const allowAdvanceReservation = dateIsFuture || (dateIsToday && beforeNoon);
    return {
      timezone: SYSTEM_TIMEZONE,
      date,
      localDate: current.date,
      localTime: `${String(current.hour).padStart(2, '0')}:${String(current.minute).padStart(2, '0')}`,
      allowCheckIn,
      allowAdvanceReservation,
      defaultAction: allowCheckIn ? 'check_in' as const : allowAdvanceReservation ? 'advance' as const : 'none' as const,
    };
  }

  async createStay(accessToken: string, actorId: string, input: CreateStayInput) {
    const localCheckInDate = this.localDateTime(new Date(input.plannedCheckInAt)).date;
    const policy = this.getIntakePolicy(localCheckInDate);
    const actionAllowed = input.action === 'check_in' ? policy.allowCheckIn : policy.allowAdvanceReservation;
    if (!actionAllowed) {
      throw new ApplicationError(ErrorCode.INTAKE_ACTION_NOT_AVAILABLE, 'Thao tác không khả dụng với ngày đã chọn hoặc thời điểm hiện tại.', HttpStatus.CONFLICT);
    }
    if (input.plannedCheckOutAt && new Date(input.plannedCheckOutAt).getTime() <= new Date(input.plannedCheckInAt).getTime()) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Check-out must be after check-in', HttpStatus.BAD_REQUEST);
    }
    if (!input.guest.fullName.trim()) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Guest name is required', HttpStatus.BAD_REQUEST);
    }
    if (input.action !== 'advance' && (input.depositAmount ?? 0) > 0) {
      throw new ApplicationError(ErrorCode.INVALID_AMOUNT, 'Deposit is only available for an advance reservation.', HttpStatus.BAD_REQUEST);
    }
    if (input.plannedCheckOutAt) {
      this.calculatePricing({
        roomId: input.roomId,
        guestId: '',
        plannedCheckInAt: input.plannedCheckInAt,
        plannedCheckOutAt: input.plannedCheckOutAt,
      }, input.roomRatePerNight);
    }
    return this.repository.createStay(accessToken, actorId, input);
  }

  async getAdvanceDetail(accessToken: string, reservationId: string) {
    const context = await this.repository.getAdvanceContext(accessToken, reservationId);
    if (!context) throw new ApplicationError(ErrorCode.RESERVATION_NOT_FOUND, 'Reservation was not found', HttpStatus.NOT_FOUND);

    const amountAsOf = context.reservation.actualCheckOutAt ?? new Date().toISOString();
    const isActualStay = context.reservation.status === 'checked_in' || context.reservation.status === 'checked_out';
    // `plannedCheckOutAt` is an operational estimate. Once a guest has
    // checked in, charges continue from the actual check-in until the current
    // instant (or actual checkout), even if that estimate is already past.
    const pricing = isActualStay
      ? this.pricing.calculateOpenStay(
        context.reservation.actualCheckInAt ?? context.reservation.plannedCheckInAt,
        amountAsOf,
        context.reservation.roomRateSnapshot ?? context.roomPriceAmount,
      )
      : context.reservation.plannedCheckOutAt
      ? this.calculatePricing({
          roomId: context.reservation.roomId ?? context.reservation.preferredRoomId ?? '',
          guestId: context.reservation.guestId,
          plannedCheckInAt: context.reservation.plannedCheckInAt,
          plannedCheckOutAt: context.reservation.plannedCheckOutAt,
        }, context.reservation.roomRateSnapshot ?? context.roomPriceAmount)
        : null;
    const total = pricing ? pricing.total + context.serviceTotal : null;
    const plannedCheckInDate = this.localDateTime(new Date(context.reservation.plannedCheckInAt)).date;
    const currentDate = this.localDateTime(new Date()).date;
    const canCheckIn = ['draft', 'confirmed'].includes(context.reservation.status)
      && currentDate >= plannedCheckInDate
      && context.hasReadyAssignment;
    const checkInBlockedReason = !['draft', 'confirmed'].includes(context.reservation.status)
      ? 'Reservation không ở trạng thái có thể nhận phòng.'
      : currentDate < plannedCheckInDate
        ? 'Chỉ có thể nhận phòng từ ngày nhận dự kiến.'
        : !context.hasReadyAssignment
          ? 'Chưa có phòng cùng loại ở trạng thái sẵn sàng để nhận khách.'
          : null;

    return {
      reservationId: context.reservation.id,
      reservationStatus: context.reservation.status,
      roomId: context.reservation.roomId,
      preferredRoomId: context.reservation.preferredRoomId,
      roomNumber: context.roomNumber,
      preferredRoomNumber: context.preferredRoomNumber,
      floorId: context.floorId,
      floorNumber: context.floorNumber,
      roomTypeId: context.reservation.roomTypeId,
      roomTypeName: context.roomTypeName,
      guestId: context.reservation.guestId,
      guestName: context.guestName,
      contactPhone: context.contactPhone,
      note: context.reservation.note ?? null,
      checkInAt: context.reservation.plannedCheckInAt,
      checkOutAt: context.reservation.plannedCheckOutAt,
      roomPriceAmount: context.reservation.roomRateSnapshot ?? context.roomPriceAmount,
      estimatedRoomAmount: pricing?.total ?? null,
      depositPaidAmount: context.paymentSummary.depositPaidAmount,
      totalPaidAmount: context.paymentSummary.totalPaidAmount,
      remainingAmount: total === null ? null : total - context.paymentSummary.totalPaidAmount,
      isOpenEnded: context.reservation.plannedCheckOutAt === null,
      chargedNights: pricing?.nights ?? null,
      amountAsOf: pricing ? amountAsOf : null,
      currency: 'VND' as const,
      canCancel: ['draft', 'confirmed'].includes(context.reservation.status),
      canCheckIn,
      checkInBlockedReason,
      version: context.reservation.version,
      updatedAt: context.reservation.updatedAt,
    };
  }

  async get(accessToken: string, reservationId: string): Promise<ReservationEntity> {
    const reservation = await this.repository.findById(accessToken, reservationId);
    if (!reservation) throw new ApplicationError(ErrorCode.RESERVATION_NOT_FOUND, 'Reservation was not found', HttpStatus.NOT_FOUND);
    return reservation;
  }

  async create(accessToken: string, actorId: string, input: ReservationInput): Promise<ReservationEntity> {
    const roomRate = await this.repository.getRoomRate(accessToken, input.roomId);
    if (input.plannedCheckOutAt) this.calculatePricing(input, roomRate);
    return this.repository.create(accessToken, actorId, input, roomRate);
  }

  async updateDetails(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, input: ReservationDetailsUpdate): Promise<ReservationEntity> {
    const current = await this.get(accessToken, reservationId);
    if (['checked_out', 'cancelled', 'no_show'].includes(current.status)) {
      throw new ApplicationError(ErrorCode.INVALID_RESERVATION_TRANSITION, 'Terminal reservations cannot be edited', HttpStatus.CONFLICT);
    }
    const checkIn = input.plannedCheckInAt ?? current.plannedCheckInAt;
    const checkOut = input.plannedCheckOutAt !== undefined ? input.plannedCheckOutAt : current.plannedCheckOutAt;
    if (checkOut && new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Check-out must be after check-in', HttpStatus.BAD_REQUEST);
    }
    if (current.status === 'checked_in' && input.plannedCheckOutAt !== undefined) {
      return this.repository.updateOpenStayCheckout(accessToken, actorId, reservationId, expectedVersion, input);
    }
    return this.repository.updateDetails(accessToken, actorId, reservationId, expectedVersion, input);
  }

  async preview(accessToken: string, input: ReservationInput, manualAdjustment?: number): Promise<PricingResult> {
    const roomRate = await this.repository.getRoomRate(accessToken, input.roomId);
    if (!input.plannedCheckOutAt) return this.pricing.calculateOpenStay(input.plannedCheckInAt, input.plannedCheckInAt, roomRate);
    return this.calculatePricing(input, roomRate, manualAdjustment);
  }

  async transition(accessToken: string, actorId: string, reservationId: string, version: number, status: ReservationStatus, reason?: string): Promise<ReservationEntity> {
    const current = await this.get(accessToken, reservationId);
    this.assertTransition(current.status, status, reason);
    return this.repository.updateStatus(accessToken, actorId, reservationId, version, status, reason);
  }

  async checkout(accessToken: string, actorId: string, reservationId: string, version: number): Promise<ReservationEntity> {
    const current = await this.get(accessToken, reservationId);
    if (current.status !== 'checked_in') throw new ApplicationError(ErrorCode.INVALID_RESERVATION_TRANSITION, 'Only checked-in reservations can be checked out', 409);
    const preview = await this.checkoutPreview(accessToken, reservationId);
    if (preview.balance < 0) throw new ApplicationError(ErrorCode.CHECKOUT_REFUND_REQUIRED, 'Refund is required before checkout', HttpStatus.CONFLICT);
    return this.repository.checkout(accessToken, actorId, reservationId, version, preview.balance);
  }

  async checkoutPreview(accessToken: string, reservationId: string) {
    const reservation = await this.get(accessToken, reservationId);
    const amountAsOf = reservation.actualCheckOutAt ?? new Date().toISOString();
    const pricing = reservation.status === 'checked_in' || reservation.status === 'checked_out'
      ? this.pricing.calculateOpenStay(
        reservation.actualCheckInAt ?? reservation.plannedCheckInAt,
        amountAsOf,
        reservation.roomRateSnapshot,
      )
      : reservation.plannedCheckOutAt
        ? this.calculatePricing({
          roomId: reservation.roomId ?? reservation.preferredRoomId ?? '',
          guestId: reservation.guestId,
          plannedCheckInAt: reservation.plannedCheckInAt,
          plannedCheckOutAt: reservation.plannedCheckOutAt,
        }, reservation.roomRateSnapshot)
        : this.pricing.calculateOpenStay(reservation.plannedCheckInAt, amountAsOf, reservation.roomRateSnapshot);
    const financials = await this.repository.getFinancials(accessToken, reservationId);
    const total = pricing.total + financials.serviceTotal;
    return {
      reservationId,
      roomAmount: pricing.total,
      serviceAmount: financials.serviceTotal,
      total,
      paidAmount: financials.paidAmount,
      balance: total - financials.paidAmount,
      lateCheckout: pricing.lateCheckout,
      isOpenEnded: reservation.plannedCheckOutAt === null,
      chargedNights: pricing.nights,
      amountAsOf,
      charges: pricing.charges,
    };
  }

  private calculatePricing(input: ReservationInput, roomRate: number | null, manualAdjustment?: number): PricingResult {
    if (!input.plannedCheckOutAt) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'A planned checkout is required for fixed stay pricing', HttpStatus.BAD_REQUEST);
    }
    return this.pricing.calculate({
      checkInAt: input.plannedCheckInAt,
      checkOutAt: input.plannedCheckOutAt,
      roomRateSnapshot: roomRate,
      manualAdjustment,
    });
  }

  private localDateTime(value: Date): { date: string; hour: number; minute: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: SYSTEM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value).reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  }

  private assertTransition(from: ReservationStatus, to: ReservationStatus, reason?: string): void {
    const allowed: Record<ReservationStatus, ReservationStatus[]> = {
      draft: ['confirmed', 'checked_in', 'cancelled'],
      confirmed: ['checked_in', 'cancelled'],
      checked_in: ['checked_out', 'cancelled'],
      checked_out: [],
      cancelled: [],
      no_show: [],
    };
    if (!allowed[from].includes(to)) throw new ApplicationError(ErrorCode.INVALID_RESERVATION_TRANSITION, `Cannot transition reservation from ${from} to ${to}`, 409);
    if (to === 'cancelled' && !reason?.trim()) throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Cancellation reason is required', 400);
  }
}
