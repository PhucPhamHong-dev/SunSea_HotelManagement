export type ReservationStatus = 'draft' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type IntakeAction = 'check_in' | 'advance';
export type RoomAssignmentMode = 'exact' | 'room_type';

export interface CreateStayGuestInput {
  fullName: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  idIssuedDate?: string;
  address?: string;
}

export interface CreateStayInput {
  roomId: string;
  assignmentMode?: RoomAssignmentMode;
  guest: CreateStayGuestInput;
  plannedCheckInAt: string;
  plannedCheckOutAt?: string | null;
  action: IntakeAction;
  roomRatePerNight: number;
  depositAmount?: number;
  note?: string;
}

export interface ReservationInput {
  roomId: string;
  guestId: string;
  plannedCheckInAt: string;
  plannedCheckOutAt?: string | null;
  depositExpected?: number;
  note?: string;
}

export interface ReservationDetailsUpdate {
  plannedCheckInAt?: string;
  plannedCheckOutAt?: string | null;
  note?: string | null;
}

export interface ReservationEntity extends Omit<ReservationInput, 'plannedCheckOutAt' | 'roomId'> {
  roomId: string | null;
  roomTypeId: string;
  preferredRoomId: string | null;
  plannedCheckOutAt: string | null;
  id: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  status: ReservationStatus;
  roomRateSnapshot: number | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceReservationListQuery {
  from?: string;
  to?: string;
  floorId?: string;
}

export interface PaymentSummary {
  depositPaidAmount: number;
  totalPaidAmount: number;
}

export interface ProcessedNoShow {
  reservationId: string;
  roomId: string | null;
}

export interface AdvanceReservationListItem {
  reservationId: string;
  status: ReservationStatus;
  roomId: string | null;
  preferredRoomId: string | null;
  roomNumber: string | null;
  floorId: string | null;
  floorNumber: number | null;
  roomTypeId: string;
  roomTypeName: string;
  guestId: string;
  guestName: string;
  checkInAt: string;
  checkOutAt: string | null;
  depositPaidAmount: number;
  currency: 'VND';
  updatedAt: string;
}

export interface AdvanceReservationContext {
  reservation: ReservationEntity;
  roomNumber: string | null;
  preferredRoomNumber: string | null;
  floorId: string | null;
  floorNumber: number | null;
  roomTypeName: string;
  guestName: string;
  contactPhone: string | null;
  roomPriceAmount: number;
  roomHousekeepingStatus: 'ready' | 'cleaning' | 'out_of_service' | null;
  hasReadyAssignment: boolean;
  serviceTotal: number;
  paymentSummary: PaymentSummary;
}

export interface CreatedStayGuest {
  id: string;
  fullName: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  idIssuedDate?: string;
  address?: string;
  note?: string;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedStay {
  action: IntakeAction;
  reservation: ReservationEntity;
  guest: CreatedStayGuest;
}

export interface ReservationRepository {
  list(accessToken: string): Promise<ReservationEntity[]>;
  findById(accessToken: string, reservationId: string): Promise<ReservationEntity | null>;
  listAdvance(accessToken: string, query: AdvanceReservationListQuery): Promise<AdvanceReservationListItem[]>;
  getAdvanceContext(accessToken: string, reservationId: string): Promise<AdvanceReservationContext | null>;
  createStay(accessToken: string, actorId: string, input: CreateStayInput): Promise<CreatedStay>;
  getRoomRate(accessToken: string, roomId: string): Promise<number | null>;
  create(accessToken: string, actorId: string, input: ReservationInput, roomRateSnapshot: number | null): Promise<ReservationEntity>;
  updateDetails(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, input: ReservationDetailsUpdate): Promise<ReservationEntity>;
  updateOpenStayCheckout(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, input: ReservationDetailsUpdate): Promise<ReservationEntity>;
  updateStatus(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, status: ReservationStatus, reason?: string): Promise<ReservationEntity>;
  checkout(accessToken: string, actorId: string, reservationId: string, expectedVersion: number, settlementAmount: number): Promise<ReservationEntity>;
  getFinancials(accessToken: string, reservationId: string): Promise<{ serviceTotal: number; paidAmount: number }>;
  markOverdueConfirmedReservations(): Promise<ProcessedNoShow[]>;
  releaseExpiredDraftReservations(): Promise<ProcessedNoShow[]>;
}
