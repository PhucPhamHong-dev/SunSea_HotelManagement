import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';

export class ReservationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true, description: 'Physical room assigned to the stay. It can be null for a room-type advance reservation.' }) roomId!: string | null;
  @ApiProperty({ format: 'uuid' }) roomTypeId!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true, description: 'Requested room preference used when the reservation is assigned.' }) preferredRoomId!: string | null;
  @ApiProperty({ format: 'uuid' }) guestId!: string;
  @ApiProperty({ format: 'date-time' }) plannedCheckInAt!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) plannedCheckOutAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) actualCheckInAt?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) actualCheckOutAt?: string | null;
  @ApiProperty({ enum: ['draft', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] }) status!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) roomRateSnapshot?: number | null;
  @ApiProperty() depositExpected!: number;
  @ApiPropertyOptional({ nullable: true, type: String }) note?: string | null;
  @ApiPropertyOptional({ nullable: true }) cancellationReason?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) cancelledAt?: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) noShowAt?: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ReservationListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [ReservationResponseDto] }) data!: ReservationResponseDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class ReservationEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: ReservationResponseDto }) data!: ReservationResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class CreatedStayGuestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ nullable: true }) phone?: string;
  @ApiPropertyOptional({ nullable: true }) idNumber?: string;
  @ApiPropertyOptional({ format: 'date', nullable: true }) dateOfBirth?: string;
  @ApiPropertyOptional({ format: 'date', nullable: true }) idIssuedDate?: string;
  @ApiPropertyOptional({ nullable: true }) address?: string;
  @ApiProperty() active!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CreateStayResponseDto {
  @ApiProperty({ enum: ['check_in', 'advance'] }) action!: 'check_in' | 'advance';
  @ApiProperty({ type: ReservationResponseDto }) reservation!: ReservationResponseDto;
  @ApiProperty({ type: CreatedStayGuestDto }) guest!: CreatedStayGuestDto;
}

export class CreateStayEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: CreateStayResponseDto }) data!: CreateStayResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class IntakePolicyResponseDto {
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) timezone!: string;
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty({ format: 'date' }) localDate!: string;
  @ApiProperty({ example: '11:30' }) localTime!: string;
  @ApiProperty() allowCheckIn!: boolean;
  @ApiProperty() allowAdvanceReservation!: boolean;
  @ApiProperty({ enum: ['check_in', 'advance', 'none'] }) defaultAction!: 'check_in' | 'advance' | 'none';
}

export class IntakePolicyEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: IntakePolicyResponseDto }) data!: IntakePolicyResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class PricingPreviewResponseDto {
  @ApiProperty({ enum: ['SHORT_STAY', 'NIGHTLY', 'MANUAL_REVIEW'] }) billingMode!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() nights!: number;
  @ApiProperty() lateCheckout!: boolean;
  @ApiProperty() requiresManualReview!: boolean;
  @ApiProperty() roomAmount!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [Object] }) charges!: Array<Record<string, unknown>>;
}

export class PricingPreviewEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: PricingPreviewResponseDto }) data!: PricingPreviewResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class CheckoutPreviewResponseDto {
  @ApiProperty() reservationId!: string;
  @ApiProperty() roomAmount!: number;
  @ApiProperty() serviceAmount!: number;
  @ApiProperty() total!: number;
  @ApiProperty() paidAmount!: number;
  @ApiProperty() balance!: number;
  @ApiProperty() lateCheckout!: boolean;
  @ApiProperty({ description: 'Whether this stay has no planned checkout and is billed live.' }) isOpenEnded!: boolean;
  @ApiProperty({ nullable: true, type: Number, description: 'Number of room nights currently charged by the Backend.' }) chargedNights!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Instant used by the Backend to calculate live open-stay pricing.' }) amountAsOf!: string | null;
  @ApiProperty({ type: [Object] }) charges!: Array<Record<string, unknown>>;
}

export class CheckoutPreviewEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: CheckoutPreviewResponseDto }) data!: CheckoutPreviewResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class AdvanceReservationListItemDto {
  @ApiProperty({ format: 'uuid' }) reservationId!: string;
  @ApiProperty({ enum: ['draft', 'confirmed'] }) status!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) roomId!: string | null;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) preferredRoomId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) roomNumber!: string | null;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) floorId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) floorNumber!: number | null;
  @ApiProperty({ format: 'uuid' }) roomTypeId!: string;
  @ApiProperty() roomTypeName!: string;
  @ApiProperty({ format: 'uuid' }) guestId!: string;
  @ApiProperty() guestName!: string;
  @ApiProperty({ format: 'date-time' }) checkInAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) checkOutAt!: string | null;
  @ApiProperty() depositPaidAmount!: number;
  @ApiProperty({ enum: ['VND'] }) currency!: 'VND';
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AdvanceReservationListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [AdvanceReservationListItemDto] }) data!: AdvanceReservationListItemDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class AdvanceReservationDetailDto {
  @ApiProperty({ format: 'uuid' }) reservationId!: string;
  @ApiProperty({ enum: ['draft', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] }) reservationStatus!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) roomId!: string | null;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) preferredRoomId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) roomNumber!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) preferredRoomNumber!: string | null;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) floorId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) floorNumber!: number | null;
  @ApiProperty({ format: 'uuid' }) roomTypeId!: string;
  @ApiProperty() roomTypeName!: string;
  @ApiProperty({ format: 'uuid' }) guestId!: string;
  @ApiProperty() guestName!: string;
  @ApiProperty({ nullable: true, type: String }) contactPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) checkInAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) checkOutAt!: string | null;
  @ApiProperty() roomPriceAmount!: number;
  @ApiProperty({ nullable: true, type: Number }) estimatedRoomAmount!: number | null;
  @ApiProperty() depositPaidAmount!: number;
  @ApiProperty() totalPaidAmount!: number;
  @ApiProperty({ nullable: true, type: Number }) remainingAmount!: number | null;
  @ApiProperty() isOpenEnded!: boolean;
  @ApiProperty({ nullable: true, type: Number }) chargedNights!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) amountAsOf!: string | null;
  @ApiProperty({ enum: ['VND'] }) currency!: 'VND';
  @ApiProperty() canCancel!: boolean;
  @ApiProperty() canCheckIn!: boolean;
  @ApiProperty({ nullable: true, type: String }) checkInBlockedReason!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AdvanceReservationDetailEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: AdvanceReservationDetailDto }) data!: AdvanceReservationDetailDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}
