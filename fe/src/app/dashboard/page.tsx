'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api/api-error';
import { ConnectionStatus } from '../../components/feedback/connection-status';
import { AdvanceReservations } from '../../features/advance-reservations/advance-reservations';
import { AdvanceReservationPanel } from '../../features/advance-reservations/advance-reservation-panel';
import { CalendarPanel } from '../../features/calendar/calendar-panel';
import { dateKey, parseDateKey, reservationCoversDate } from '../../features/calendar/calendar-utils';
import { useGuests } from '../../features/guests/use-guests';
import { LogoutButton } from '../../features/auth/logout-button';
import { useCurrentUser } from '../../features/auth/use-auth-session';
import { FloorMapPanel } from '../../features/floor-map/floor-map-panel';
import { RoomTurnoverPanel } from '../../features/rooms/room-turnover-panel';
import { useCompleteHousekeeping, useRooms } from '../../features/rooms/use-rooms';
import { StayInfoPanel, type GuestEditableField, type ReservationEditableField } from '../../features/reservations/stay-info-panel';
import { CreateStayPanel } from '../../features/reservations/create-stay-panel';
import { useCancelReservation, useCheckInReservation, useCheckoutPreview, useCheckoutReservation, useConfirmReservation } from '../../features/reservations/use-reservation-actions';
import { useCreateStay, useIntakePolicy } from '../../features/reservations/use-create-stay';
import { useAdvanceReservationDetail, useAdvanceReservations, useReservations } from '../../features/reservations/use-reservations';
import { useStayAutosave } from '../../features/reservations/use-stay-autosave';
import { useAddReservationService, useReservationServices, useUpdateReservationService } from '../../features/services/use-services';
import { usePayments } from '../../features/payments/use-payments';
import { useDashboardRealtime } from '../../features/realtime/use-dashboard-realtime';
import { apiClient, type AddReservationServiceDto, type AdvanceReservationListItem, type CreateStayDto, type EquivalentRoomSearch, type UpdateReservationServiceDto } from '../../lib/api/api-client';
import { useDashboardUiStore } from '../../stores/dashboard-ui.store';

export default function DashboardPage() {
  const router = useRouter();
  const authSession = useCurrentUser();
  const authenticated = Boolean(authSession.data);
  const { selectedDate, selectedFloorId, selectedRoomId, selectedReservationId, selectionKind, setSelectedDate, setSelectedFloorId, select, clearSelection, clearReservation } = useDashboardUiStore();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = parseDateKey(dateKey(new Date()));
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [actionMessage, setActionMessage] = useState('');
  const [bookingMode, setBookingMode] = useState(false);
  const [checkingAlternatives, setCheckingAlternatives] = useState(false);
  const [pendingAlternative, setPendingAlternative] = useState<{ body: CreateStayDto; search: EquivalentRoomSearch } | null>(null);

  const floorsQuery = useQuery({
    queryKey: ['floors'],
    queryFn: async () => (await apiClient.floors.list()).data.data,
    enabled: authenticated,
  });
  const advanceReservationsQuery = useAdvanceReservations(authenticated);
  const reservationsQuery = useReservations(authenticated);
  const guestsQuery = useGuests(authenticated);
  const activeFloorId = selectedFloorId || floorsQuery.data?.[0]?.id || '';
  const selectedFloor = floorsQuery.data?.find((floor) => floor.id === activeFloorId);
  const floorNumber = selectedFloor?.floorNumber;

  const selectedFloorRoomsQuery = useRooms(activeFloorId, selectedDate, authenticated && Boolean(activeFloorId));

  const selectedReservation = useMemo(() => {
    const reservations = reservationsQuery.data ?? [];
    if (selectedReservationId) return reservations.find((reservation) => reservation.id === selectedReservationId);
    return reservations.find((reservation) => (reservation.roomId === selectedRoomId || reservation.preferredRoomId === selectedRoomId) && reservationCoversDate(reservation, selectedDate));
  }, [reservationsQuery.data, selectedReservationId, selectedRoomId, selectedDate]);

  // The reservation status returned by the Backend is the source of truth for
  // the panel. UI selection can become stale after changing a date, receiving a
  // realtime event, or selecting a room directly from the map.
  const resolvedSelectionKind = useMemo(() => {
    if (!selectedReservation) return selectionKind;
    if (selectedReservation.status === 'checked_in') return 'activeStay' as const;
    if (selectedReservation.status === 'draft' || selectedReservation.status === 'confirmed') return 'advanceReservation' as const;
    return 'room' as const;
  }, [selectedReservation, selectionKind]);

  const selectedGuest = guestsQuery.data?.find((guest) => guest.id === selectedReservation?.guestId);
  const servicesQuery = useReservationServices(selectedReservation?.status === 'checked_in' ? selectedReservation.id : undefined);
  const paymentsQuery = usePayments(selectedReservation?.id);
  const checkoutPreviewQuery = useCheckoutPreview(selectedReservation?.status === 'checked_in' ? selectedReservation.id : undefined);
  const advanceDetailQuery = useAdvanceReservationDetail(
    resolvedSelectionKind === 'advanceReservation' ? selectedReservation?.id : undefined,
    authenticated,
  );
  useDashboardRealtime(selectedReservation?.id, authenticated);
  const addService = useAddReservationService();
  const updateService = useUpdateReservationService();
  const confirmReservation = useConfirmReservation();
  const checkInReservation = useCheckInReservation();
  const cancelReservation = useCancelReservation();
  const checkoutReservation = useCheckoutReservation();
  const completeHousekeeping = useCompleteHousekeeping();
  const createStay = useCreateStay();
  const autosave = useStayAutosave({
    onError: (error) => setActionMessage(error instanceof ApiError ? error.message : 'Không thể tự động lưu thay đổi.'),
  });

  const floorIndex = floorsQuery.data?.findIndex((floor) => floor.id === activeFloorId) ?? -1;
  const goToFloor = (index: number) => {
    const floor = floorsQuery.data?.[index];
    if (!floor) return;
    setActionMessage('');
    setSelectedFloorId(floor.id);
    setBookingMode(false);
    clearSelection();
  };

  const selectReservation = (reservation: AdvanceReservationListItem) => {
    const selectionRoomId = reservation.roomId ?? reservation.preferredRoomId;
    if (!selectionRoomId) {
      setActionMessage('Đặt phòng này chưa có phòng ưu tiên để hiển thị trên sơ đồ.');
      return;
    }
    setActionMessage('');
    if (reservation.floorId) setSelectedFloorId(reservation.floorId);
    setBookingMode(false);
    setSelectedDate(dateKey(new Date(reservation.checkInAt)));
    const checkIn = parseDateKey(dateKey(new Date(reservation.checkInAt)));
    setCalendarMonth(new Date(checkIn.getFullYear(), checkIn.getMonth(), 1));
    // setSelectedDate intentionally clears the previous reservation. Select
    // afterwards so a click always opens the advance-reservation panel.
    select({ kind: 'advanceReservation', roomId: selectionRoomId, reservationId: reservation.reservationId });
  };

  const handleSelectDate = (date: string) => {
    setActionMessage('');
    setSelectedDate(date);
    setBookingMode(false);
    clearReservation();
  };

  const handleSelectRoom = (roomId: string) => {
    setActionMessage('');
    setBookingMode(false);
    const reservation = (reservationsQuery.data ?? []).find((item) => (item.roomId === roomId || item.preferredRoomId === roomId) && reservationCoversDate(item, selectedDate));
    if (reservation?.status === 'checked_in') {
      select({ kind: 'activeStay', roomId, reservationId: reservation.id });
      return;
    }
    if (reservation?.status === 'draft' || reservation?.status === 'confirmed') {
      select({ kind: 'advanceReservation', roomId, reservationId: reservation.id });
      return;
    }
    select({ kind: 'room', roomId });
  };

  const handleBookNew = () => {
    if (!selectedRoomId) return;
    setActionMessage('');
    setBookingMode(true);
  };

  const handleAddService = async (body: AddReservationServiceDto) => {
    if (!selectedReservation) throw new Error('Không xác định được lưu trú để thêm dịch vụ.');
    setActionMessage('');
    try {
      await addService.mutateAsync({ reservationId: selectedReservation.id, body });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể thêm dịch vụ.');
      throw error;
    }
  };

  const handleUpdateService = async (serviceId: string, body: UpdateReservationServiceDto) => {
    if (!selectedReservation) throw new Error('Không xác định được lưu trú để sửa dịch vụ.');
    setActionMessage('');
    try {
      await updateService.mutateAsync({ serviceId, body });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể cập nhật dịch vụ.');
      throw error;
    }
  };

  const handleConfirm = () => {
    if (!selectedReservation) return;
    if (selectedReservation.status !== 'draft') {
      setActionMessage('Reservation này đã được xác nhận.');
      return;
    }
    setActionMessage('');
    confirmReservation.mutate({ reservationId: selectedReservation.id, version: selectedReservation.version }, {
      onSuccess: () => setActionMessage('Đã xác nhận đặt phòng.'),
      onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Không thể lưu đặt phòng.'),
    });
  };

  const handleUpdateGuest = async (field: GuestEditableField, value: string): Promise<void> => {
    if (!selectedGuest) throw new Error('Không xác định được khách để tự lưu.');
    setActionMessage('');
    await autosave.saveGuest(selectedGuest.id, { [field]: value });
  };

  const handleUpdateReservation = async (field: ReservationEditableField, value: string | null): Promise<void> => {
    if (!selectedReservation) throw new Error('Không xác định được lưu trú để tự lưu.');
    setActionMessage('');
    await autosave.saveReservation(selectedReservation.id, selectedReservation.version, { [field]: value });
  };

  const handleCheckout = async () => {
    if (!selectedReservation) throw new Error('Không xác định được lưu trú để trả phòng.');
    setActionMessage('');
    try {
      await checkoutReservation.mutateAsync({ reservationId: selectedReservation.id, version: selectedReservation.version });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể trả phòng.');
      await checkoutPreviewQuery.refetch();
      throw error;
    }
  };

  const handleCheckIn = () => {
    if (!selectedReservation || !advanceDetailQuery.data?.canCheckIn) return;
    setActionMessage('');
    checkInReservation.mutate({ reservationId: selectedReservation.id, version: advanceDetailQuery.data.version }, {
      onSuccess: () => {
        select({ kind: 'activeStay', roomId: advanceDetailQuery.data?.roomId ?? selectedReservation.roomId ?? selectedReservation.preferredRoomId ?? selectedRoomId ?? '', reservationId: selectedReservation.id });
        setActionMessage('Đã nhận phòng thành công.');
      },
      onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Không thể nhận phòng.'),
    });
  };

  const handleCancel = (reason: string) => {
    if (!selectedReservation || !advanceDetailQuery.data?.canCancel) return;
    setActionMessage('');
    cancelReservation.mutate({ reservationId: selectedReservation.id, version: advanceDetailQuery.data.version, reason }, {
      onSuccess: () => {
        clearSelection();
        setActionMessage('Đã hủy đặt phòng.');
      },
      onError: (error) => setActionMessage(error instanceof Error ? error.message : 'Không thể hủy đặt phòng.'),
    });
  };

  const reservations = reservationsQuery.data ?? [];
  const rooms = selectedFloorRoomsQuery.data ?? [];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const showCreateStay = Boolean(selectedRoom && (bookingMode || (!selectedReservation && selectedRoom.status === 'available')));
  const intakePolicyQuery = useIntakePolicy(selectedDate, authenticated && showCreateStay);
  const apiUnavailable = floorsQuery.isError || selectedFloorRoomsQuery.isError || reservationsQuery.isError || guestsQuery.isError || advanceReservationsQuery.isError;

  const createStayAfterRoomConfirmed = (body: CreateStayDto) => {
    setActionMessage('');
    createStay.mutate(body, {
      onSuccess: (response) => {
        const created = response.data.data;
        const checkIn = parseDateKey(dateKey(new Date(created.reservation.plannedCheckInAt)));
        setSelectedDate(dateKey(checkIn));
        setCalendarMonth(new Date(checkIn.getFullYear(), checkIn.getMonth(), 1));
        select({
          kind: created.action === 'check_in' ? 'activeStay' : 'advanceReservation',
          roomId: created.reservation.roomId ?? created.reservation.preferredRoomId ?? body.roomId,
          reservationId: created.reservation.id,
        });
        setBookingMode(false);
        setPendingAlternative(null);
        setActionMessage(created.action === 'check_in' ? 'Đã nhận phòng thành công.' : 'Đã tạo đặt phòng trước.');
      },
      onError: (error) => setActionMessage(error instanceof ApiError ? error.message : 'Không thể tạo lưu trú.'),
    });
  };

  const handleCreateStay = async (body: CreateStayDto) => {
    if (checkingAlternatives || createStay.isPending) return;
    setActionMessage('');
    setCheckingAlternatives(true);
    try {
      const checkOutAt = typeof body.plannedCheckOutAt === 'string' ? body.plannedCheckOutAt : null;
      const response = await apiClient.rooms.equivalents(body.roomId, {
        checkInAt: body.plannedCheckInAt,
        ...(checkOutAt ? { checkOutAt } : {}),
      });
      const search = response.data.data;
      if (search.isRequestedRoomAvailable && search.availableRoomCount > 0) {
        createStayAfterRoomConfirmed(body);
        return;
      }
      if (!search.alternatives.length && !(body.action === 'advance' && search.canReserveRoomType)) {
        setActionMessage('Không có phòng tương đương đang sẵn sàng cho khoảng thời gian đã chọn.');
        return;
      }
      setPendingAlternative({ body, search });
    } catch (error) {
      setActionMessage(error instanceof ApiError ? error.message : 'Không thể kiểm tra phòng tương đương.');
    } finally {
      setCheckingAlternatives(false);
    }
  };

  const handleCompleteHousekeeping = () => {
    if (!selectedRoom) return;
    setActionMessage('');
    completeHousekeeping.mutate(selectedRoom.id, {
      onSuccess: () => setActionMessage(`Phòng ${selectedRoom.roomNumber} đã sẵn sàng phục vụ.`),
      onError: (error) => setActionMessage(error instanceof ApiError ? error.message : 'Không thể cập nhật trạng thái dọn phòng.'),
    });
  };

  useEffect(() => {
    if (authSession.isSuccess && !authSession.data) router.replace('/login');
  }, [authSession.data, authSession.isSuccess, router]);

  useEffect(() => {
    if (!selectedFloorId && floorsQuery.data?.[0]?.id) setSelectedFloorId(floorsQuery.data[0].id);
  }, [floorsQuery.data, selectedFloorId, setSelectedFloorId]);

  if (authSession.isLoading) return <main className="app-shell"><div className="state-card">Đang kiểm tra phiên đăng nhập…</div></main>;
  if (authSession.isError) return <main className="app-shell"><div className="state-card state-card--error">Không thể kiểm tra phiên đăng nhập với backend.</div></main>;
  if (!authSession.data) return <main className="app-shell"><div className="state-card">Đang chuyển tới màn đăng nhập…</div></main>;
  const currentUser = authSession.data;

  return (
    <main className="app-shell app-shell--hotel">
      <header className="dashboard-header">
        <div className="brand-lockup"><span className="brand-lockup__mark">S</span><span>SUNSEA</span></div>
        <div className="dashboard-header__actions">
          <div className="user-session" aria-label="Phiên đăng nhập"><span className="user-session__name">{currentUser.username}</span><span className="role-badge">{currentUser.role.toUpperCase()}</span></div>
          <ConnectionStatus />
          <LogoutButton />
        </div>
      </header>
      {apiUnavailable && <div className="api-banner" role="status">Backend đang không trả dữ liệu vận hành. Các khu vực sẽ tự đồng bộ lại khi phiên đăng nhập và API sẵn sàng.</div>}

      <div className="dashboard-top">
        <div className="dashboard-left-column">
          <CalendarPanel month={calendarMonth} selectedDate={selectedDate} reservations={reservations} onSelectDate={handleSelectDate} onChangeMonth={setCalendarMonth} />
          <AdvanceReservations reservations={advanceReservationsQuery.data ?? []} selectedReservationId={selectedReservationId} onSelect={selectReservation} isLoading={advanceReservationsQuery.isLoading} isError={advanceReservationsQuery.isError} />
        </div>
        {showCreateStay && selectedRoom ? <CreateStayPanel
            room={selectedRoom}
            selectedDate={selectedDate}
            policy={intakePolicyQuery.data}
            policyLoading={intakePolicyQuery.isLoading}
            isPending={createStay.isPending || checkingAlternatives}
            allowUnavailableRoom={bookingMode}
            actionMessage={actionMessage}
            onCreate={handleCreateStay}
          /> : resolvedSelectionKind === 'advanceReservation' ? <AdvanceReservationPanel detail={advanceDetailQuery.data} payments={paymentsQuery.data ?? []} paymentsLoading={paymentsQuery.isLoading} isLoading={advanceDetailQuery.isLoading} isError={advanceDetailQuery.isError} onCancel={handleCancel} onCheckIn={handleCheckIn} cancelPending={cancelReservation.isPending} checkInPending={checkInReservation.isPending} actionMessage={actionMessage} onBookNew={handleBookNew} /> : selectedRoom && !selectedReservation ? <RoomTurnoverPanel
            room={selectedRoom}
            isPending={completeHousekeeping.isPending}
            actionMessage={actionMessage}
            onComplete={handleCompleteHousekeeping}
            onBookNew={handleBookNew}
          /> : <StayInfoPanel
            reservation={selectedReservation}
            guest={selectedGuest}
            roomNumber={selectedRoom?.roomNumber}
            services={servicesQuery.data ?? []}
            payments={paymentsQuery.data ?? []}
            remainingAmount={checkoutPreviewQuery.data?.balance}
            checkoutPreview={checkoutPreviewQuery.data}
            checkoutPreviewLoading={checkoutPreviewQuery.isFetching}
            totalLoading={checkoutPreviewQuery.isLoading}
            servicesLoading={servicesQuery.isLoading}
            paymentsLoading={paymentsQuery.isLoading}
            onUpdateGuest={handleUpdateGuest}
            onUpdateReservation={handleUpdateReservation}
            onAddService={handleAddService}
            serviceSaving={addService.isPending}
            onUpdateService={handleUpdateService}
            serviceUpdating={updateService.isPending}
            onCheckout={handleCheckout}
            onOpenCheckoutBill={() => { void checkoutPreviewQuery.refetch(); }}
            onConfirm={handleConfirm}
            onBookNew={handleBookNew}
            checkoutPending={checkoutReservation.isPending}
            confirmPending={confirmReservation.isPending}
            actionMessage={actionMessage}
          />}
      </div>

      {selectedFloor && floorNumber !== undefined ? <FloorMapPanel floorId={activeFloorId} floorNumber={floorNumber} rooms={rooms} isLoading={selectedFloorRoomsQuery.isLoading} isError={selectedFloorRoomsQuery.isError} selectedRoomId={selectedRoomId} selectionKind={resolvedSelectionKind} onSelectRoom={handleSelectRoom} canGoPrevious={floorIndex > 0} canGoNext={floorIndex >= 0 && floorIndex < (floorsQuery.data?.length ?? 1) - 1} onPreviousFloor={() => goToFloor(floorIndex - 1)} onNextFloor={() => goToFloor(floorIndex + 1)} /> : (
        <section className="floor-panel" aria-labelledby="floor-map-empty-title">
          <div className="floor-panel__heading"><div><h2 id="floor-map-empty-title">Sơ đồ phòng</h2><p>Chưa có dữ liệu tầng từ Backend.</p></div><span className="floor-panel__sync">Chờ dữ liệu</span></div>
          <p className="empty-copy">Tạo tầng và phòng qua API Backend để bắt đầu vận hành.</p>
        </section>
      )}

      {pendingAlternative && <EquivalentRoomModal
        search={pendingAlternative.search}
        onClose={() => setPendingAlternative(null)}
        onConfirm={(roomId) => createStayAfterRoomConfirmed({ ...pendingAlternative.body, roomId })}
        onReserveRoomType={pendingAlternative.body.action === 'advance' && pendingAlternative.search.canReserveRoomType
          ? () => createStayAfterRoomConfirmed({ ...pendingAlternative.body, assignmentMode: 'room_type' })
          : undefined}
      />}
    </main>
  );
}

function EquivalentRoomModal({ search, onClose, onConfirm, onReserveRoomType }: { search: EquivalentRoomSearch; onClose: () => void; onConfirm: (roomId: string) => void; onReserveRoomType?: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="equivalent-room-title">
        <div className="modal-card__heading"><h3 id="equivalent-room-title">Đề xuất phòng tương đương</h3><button type="button" className="modal-close" aria-label="Đóng" onClick={onClose}>×</button></div>
        <p className="modal-copy">Phòng {search.requestedRoom.roomNumber} không thể phục vụ khoảng thời gian này. Chọn phòng {search.roomTypeName.toLocaleLowerCase()} tương đương, hoặc giữ loại phòng và xếp số phòng khi khách đến.</p>
        <div className="equivalent-room-list">
          {search.alternatives.map((room) => <button key={room.id} type="button" className="equivalent-room-option" onClick={() => onConfirm(room.id)}>
            <strong>Phòng {room.roomNumber}</strong><span>{room.bedCount} giường · {room.hasWindow ? 'Có cửa sổ' : 'Không cửa sổ'}</span><b>Chọn</b>
          </button>)}
        </div>
        {onReserveRoomType && <button type="button" className="primary-button equivalent-room-hold" onClick={onReserveRoomType}>Giữ loại phòng, xếp phòng sau ({search.availableRoomCount} còn chỗ)</button>}
        <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose}>Quay lại</button></div>
      </section>
    </div>
  );
}
