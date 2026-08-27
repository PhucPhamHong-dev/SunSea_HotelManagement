import {
  authControllerLogin,
  authControllerMe,
  authControllerLogout,
  authControllerRefresh,
  floorsControllerList,
  guestsControllerList,
  guestsControllerUpdate,
  paymentsControllerList,
  reservationsControllerCheckOut,
  reservationsControllerCheckIn,
  reservationsControllerCancel,
  reservationsControllerCheckoutPreview,
  reservationsControllerConfirm,
  reservationsControllerAdvanceDetail,
  reservationsControllerListAdvance,
  reservationsControllerGet,
  reservationsControllerList,
  reservationsControllerIntakePolicy,
  reservationsControllerCreateStay,
  reservationsControllerUpdateDetails,
  roomsControllerGet,
  roomsControllerEquivalents,
  roomsControllerList,
  roomsControllerStatusByDate,
  roomsControllerUpdateHousekeeping,
  servicesControllerAdd,
  servicesControllerListCatalog,
  servicesControllerListReservationServices,
  servicesControllerUpdateReservationService,
} from './generated/client';
import type { AddReservationServiceDto } from './generated/models/addReservationServiceDto';
import type { FloorResponseDto } from './generated/models/floorResponseDto';
import type { AuthUserResponseDto } from './generated/models/authUserResponseDto';
import type { GuestResponseDto } from './generated/models/guestResponseDto';
import type { UpdateGuestDto } from './generated/models/updateGuestDto';
import type { GuestsControllerListParams } from './generated/models/guestsControllerListParams';
import type { PaymentResponseDto } from './generated/models/paymentResponseDto';
import type { PaymentsControllerListParams } from './generated/models/paymentsControllerListParams';
import type { ReservationActionDto } from './generated/models/reservationActionDto';
import type { ReservationResponseDto } from './generated/models/reservationResponseDto';
import type { UpdateReservationDto } from './generated/models/updateReservationDto';
import type { CancelReservationDto } from './generated/models/cancelReservationDto';
import type { ReservationsControllerListAdvanceParams } from './generated/models/reservationsControllerListAdvanceParams';
import type { AdvanceReservationListItemDto } from './generated/models/advanceReservationListItemDto';
import type { AdvanceReservationDetailDto } from './generated/models/advanceReservationDetailDto';
import type { CreateStayDto } from './generated/models/createStayDto';
import type { IntakePolicyEnvelopeDto } from './generated/models/intakePolicyEnvelopeDto';
import type { ReservationsControllerIntakePolicyParams } from './generated/models/reservationsControllerIntakePolicyParams';
import type { CreateStayResponseDto } from './generated/models/createStayResponseDto';
import type { ReservationServiceResponseDto } from './generated/models/reservationServiceResponseDto';
import type { RoomResponseDto } from './generated/models/roomResponseDto';
import type { RoomsControllerListParams } from './generated/models/roomsControllerListParams';
import type { RoomsControllerStatusByDateParams } from './generated/models/roomsControllerStatusByDateParams';
import type { HousekeepingDto } from './generated/models/housekeepingDto';
import type { EquivalentRoomSearchDto } from './generated/models/equivalentRoomSearchDto';
import type { RoomsControllerEquivalentsParams } from './generated/models/roomsControllerEquivalentsParams';
import type { ServiceCatalogResponseDto } from './generated/models/serviceCatalogResponseDto';
import type { LoginDto } from './generated/models/loginDto';
import type { CheckoutPreviewResponseDto } from './generated/models/checkoutPreviewResponseDto';
import type { UpdateReservationServiceDto } from './generated/models/updateReservationServiceDto';

export const apiClient = {
  floors: { list: floorsControllerList },
  rooms: {
    list: (params?: RoomsControllerListParams) => roomsControllerList(params),
    statusByDate: (params: RoomsControllerStatusByDateParams) => roomsControllerStatusByDate(params),
    equivalents: (roomId: string, params: RoomsControllerEquivalentsParams) => roomsControllerEquivalents(roomId, params),
    get: roomsControllerGet,
    updateHousekeeping: (roomId: string, body: HousekeepingDto) => roomsControllerUpdateHousekeeping(roomId, body),
  },
  guests: {
    list: (params?: GuestsControllerListParams) => guestsControllerList(params),
    update: (guestId: string, body: UpdateGuestDto) => guestsControllerUpdate(guestId, body),
  },
  reservations: {
    list: reservationsControllerList,
    listAdvance: (params?: ReservationsControllerListAdvanceParams) => reservationsControllerListAdvance(params),
    intakePolicy: (params: ReservationsControllerIntakePolicyParams) => reservationsControllerIntakePolicy(params),
    createStay: (body: CreateStayDto) => reservationsControllerCreateStay(body),
    get: reservationsControllerGet,
    advanceDetail: reservationsControllerAdvanceDetail,
    updateDetails: (reservationId: string, body: UpdateReservationDto) => reservationsControllerUpdateDetails(reservationId, body),
    confirm: (reservationId: string, body: ReservationActionDto) => reservationsControllerConfirm(reservationId, body),
    checkIn: (reservationId: string, body: ReservationActionDto) => reservationsControllerCheckIn(reservationId, body),
    cancel: (reservationId: string, body: CancelReservationDto) => reservationsControllerCancel(reservationId, body),
    checkOut: (reservationId: string, body: ReservationActionDto) => reservationsControllerCheckOut(reservationId, body),
    checkoutPreview: reservationsControllerCheckoutPreview,
  },
  services: {
    catalog: servicesControllerListCatalog,
    byReservation: servicesControllerListReservationServices,
    add: (reservationId: string, body: AddReservationServiceDto) => servicesControllerAdd(reservationId, body),
    update: (serviceId: string, body: UpdateReservationServiceDto) => servicesControllerUpdateReservationService(serviceId, body),
  },
  payments: { list: (params?: PaymentsControllerListParams) => paymentsControllerList(params) },
  auth: {
    login: (body: LoginDto) => authControllerLogin(body),
    logout: authControllerLogout,
    me: authControllerMe,
    refresh: authControllerRefresh,
  },
};

export type Floor = FloorResponseDto;
export type Room = RoomResponseDto;
export type Guest = GuestResponseDto;
export type Reservation = ReservationResponseDto;
export type ReservationService = ReservationServiceResponseDto;
export type Payment = PaymentResponseDto;
export type ServiceCatalogItem = ServiceCatalogResponseDto;
export type AuthUser = AuthUserResponseDto;
export type AdvanceReservationListItem = AdvanceReservationListItemDto;
export type EquivalentRoomSearch = EquivalentRoomSearchDto;
export type CheckoutPreview = CheckoutPreviewResponseDto;
export type { AddReservationServiceDto, AdvanceReservationDetailDto, AdvanceReservationListItemDto, CancelReservationDto, CreateStayDto, CreateStayResponseDto, HousekeepingDto, IntakePolicyEnvelopeDto, ReservationActionDto, UpdateGuestDto, UpdateReservationDto, UpdateReservationServiceDto };
