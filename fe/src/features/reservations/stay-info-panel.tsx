'use client';

import { useEffect, useRef, useState } from 'react';
import { HotelField } from '../../components/ui/hotel-field';
import type { AddReservationServiceDto, CheckoutPreview, Guest, Payment, Reservation, ReservationService, UpdateGuestDto, UpdateReservationDto, UpdateReservationServiceDto } from '../../lib/api/api-client';
import { formatCurrency, formatVndAmountInput, parseVndAmountInput, systemDateTimeLocalToIso, toDateTimeLocalInput } from '../calendar/calendar-utils';

export type GuestEditableField = keyof Pick<UpdateGuestDto, 'fullName' | 'idNumber' | 'dateOfBirth' | 'idIssuedDate' | 'address'>;
export type ReservationEditableField = keyof Pick<UpdateReservationDto, 'plannedCheckInAt' | 'plannedCheckOutAt' | 'note'>;
type EditorType = 'text' | 'date' | 'datetime-local' | 'textarea';

interface StayInfoPanelProps {
  reservation?: Reservation;
  guest?: Guest;
  roomNumber?: string;
  services: ReservationService[];
  payments: Payment[];
  remainingAmount?: number | null;
  checkoutPreview?: CheckoutPreview;
  checkoutPreviewLoading?: boolean;
  totalLoading?: boolean;
  servicesLoading?: boolean;
  paymentsLoading?: boolean;
  onUpdateGuest: (field: GuestEditableField, value: string) => Promise<void>;
  onUpdateReservation: (field: ReservationEditableField, value: string | null) => Promise<void>;
  onAddService: (body: AddReservationServiceDto) => Promise<void>;
  onUpdateService: (serviceId: string, body: UpdateReservationServiceDto) => Promise<void>;
  onCheckout: () => Promise<void>;
  onOpenCheckoutBill: () => void;
  onConfirm: () => void;
  onBookNew: () => void;
  checkoutPending?: boolean;
  confirmPending?: boolean;
  serviceSaving?: boolean;
  serviceUpdating?: boolean;
  actionMessage?: string;
}

export function StayInfoPanel({ reservation, guest, roomNumber, services, payments, remainingAmount, checkoutPreview, checkoutPreviewLoading, totalLoading, servicesLoading, paymentsLoading, onUpdateGuest, onUpdateReservation, onAddService, onUpdateService, onCheckout, onOpenCheckoutBill, onConfirm, onBookNew, checkoutPending, confirmPending, serviceSaving = false, serviceUpdating = false, actionMessage }: StayInfoPanelProps) {
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [checkoutBillOpen, setCheckoutBillOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceUnitPrice, setServiceUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [serviceNote, setServiceNote] = useState('');
  const [editingService, setEditingService] = useState<ReservationService | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceUnitPrice, setEditServiceUnitPrice] = useState('');
  const [editServiceQuantity, setEditServiceQuantity] = useState('1');
  const [editServiceNote, setEditServiceNote] = useState('');
  const serviceFormRef = useRef<HTMLFormElement>(null);
  const serviceBlurTimer = useRef<number | undefined>(undefined);
  const serviceSaveInFlight = useRef(false);
  const serviceEditFormRef = useRef<HTMLFormElement>(null);
  const serviceEditBlurTimer = useRef<number | undefined>(undefined);
  const serviceEditInFlight = useRef(false);

  useEffect(() => () => {
    if (serviceBlurTimer.current !== undefined) window.clearTimeout(serviceBlurTimer.current);
    if (serviceEditBlurTimer.current !== undefined) window.clearTimeout(serviceEditBlurTimer.current);
  }, []);

  if (!reservation) {
    return <section className="stay-panel" aria-labelledby="stay-title"><h2 id="stay-title">Thông tin lưu trú</h2><div className="stay-empty">Chọn một phòng hoặc một đặt trước để xem thông tin lưu trú.</div></section>;
  }

  const canAddService = reservation.status === 'checked_in';
  const canCheckout = reservation.status === 'checked_in';
  const canEditReservation = !['checked_out', 'cancelled', 'no_show'].includes(reservation.status);

  const openCheckoutBill = () => {
    setCheckoutError('');
    setCheckoutBillOpen(true);
    onOpenCheckoutBill();
  };

  const confirmCheckout = async () => {
    setCheckoutError('');
    try {
      await onCheckout();
      setCheckoutBillOpen(false);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Không thể xác nhận trả phòng.');
    }
  };

  const resetServiceForm = () => {
    setServiceFormOpen(false);
    setServiceName('');
    setServiceUnitPrice('');
    setQuantity('1');
    setServiceNote('');
  };

  const saveService = async () => {
    const unitPrice = parseVndAmountInput(serviceUnitPrice);
    const parsedQuantity = Number(quantity);
    if (serviceSaveInFlight.current || !serviceName.trim() || !unitPrice || unitPrice < 1 || !Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || !canAddService) return;
    serviceSaveInFlight.current = true;
    try {
      await onAddService({
        name: serviceName.trim(),
        unitPrice,
        quantity: parsedQuantity,
        ...(serviceNote.trim() ? { note: serviceNote.trim() } : {}),
      });
      resetServiceForm();
    } catch {
      // The parent reports genuine API errors. Keep the user's draft in place.
    } finally {
      serviceSaveInFlight.current = false;
    }
  };

  const scheduleServiceSave = () => {
    if (serviceBlurTimer.current !== undefined) window.clearTimeout(serviceBlurTimer.current);
    serviceBlurTimer.current = window.setTimeout(() => {
      if (!serviceFormRef.current?.contains(document.activeElement)) void saveService();
    }, 0);
  };

  const resetServiceEditor = () => {
    setEditingService(null);
    setEditServiceName('');
    setEditServiceUnitPrice('');
    setEditServiceQuantity('1');
    setEditServiceNote('');
  };

  const startServiceEdit = (service: ReservationService) => {
    setServiceFormOpen(false);
    setEditingService(service);
    setEditServiceName(service.name);
    setEditServiceUnitPrice(formatVndAmountInput(service.unitPrice));
    setEditServiceQuantity(String(service.quantity));
    setEditServiceNote(service.note ?? '');
  };

  const saveEditedService = async () => {
    if (!editingService || serviceEditInFlight.current || serviceUpdating || !serviceEditFormRef.current?.reportValidity()) return;
    const unitPrice = parseVndAmountInput(editServiceUnitPrice);
    const quantityValue = Number(editServiceQuantity);
    const name = editServiceName.trim();
    const note = editServiceNote.trim() || null;
    if (!name || !unitPrice || unitPrice < 1 || !Number.isSafeInteger(quantityValue) || quantityValue < 1) return;
    const unchanged = name === editingService.name
      && unitPrice === editingService.unitPrice
      && quantityValue === editingService.quantity
      && note === (editingService.note ?? null);
    if (unchanged) {
      resetServiceEditor();
      return;
    }
    serviceEditInFlight.current = true;
    try {
      await onUpdateService(editingService.id, { name, unitPrice, quantity: quantityValue, note });
      resetServiceEditor();
    } catch {
      // The parent reports genuine API errors. Keep the current edit in place.
    } finally {
      serviceEditInFlight.current = false;
    }
  };

  const scheduleEditedServiceSave = () => {
    if (serviceEditBlurTimer.current !== undefined) window.clearTimeout(serviceEditBlurTimer.current);
    serviceEditBlurTimer.current = window.setTimeout(() => {
      if (!serviceEditFormRef.current?.contains(document.activeElement)) void saveEditedService();
    }, 0);
  };

  return (
    <section className="stay-panel" aria-labelledby="stay-title">
      <h2 id="stay-title">Thông tin lưu trú</h2>
      <div className="hotel-field-grid hotel-field-grid--stay">
        <EditableInfoCell label="Khách" value={guest?.fullName} onCommit={(value) => onUpdateGuest('fullName', value)} />
        <EditableInfoCell label="Số CCCD" value={guest?.idNumber} onCommit={(value) => onUpdateGuest('idNumber', value)} />
        <InfoCell label="Giá phòng" value={formatCurrency(reservation.roomRateSnapshot)} />
        <InfoCell label="Còn phải thu" value={totalLoading ? 'Đang tính…' : formatCurrency(remainingAmount)} />
        <EditableInfoCell label="Ngày sinh" type="date" value={guest?.dateOfBirth} onCommit={(value) => onUpdateGuest('dateOfBirth', value)} />
        <EditableInfoCell label="Ngày cấp CCCD" type="date" value={guest?.idIssuedDate} onCommit={(value) => onUpdateGuest('idIssuedDate', value)} />
        <EditableInfoCell label="Ngày nhận" type="datetime-local" value={toDateTimeLocalInput(reservation.plannedCheckInAt)} disabled={!canEditReservation} onCommit={(value) => {
          const iso = systemDateTimeLocalToIso(value);
          return iso ? onUpdateReservation('plannedCheckInAt', iso) : Promise.resolve();
        }} />
        {reservation.status === 'checked_out'
          ? <InfoCell label="Trả phòng thực tế" value={formatDateTimeValue(reservation.actualCheckOutAt)} />
          : <EditableInfoCell label="Dự kiến trả" type="datetime-local" value={toDateTimeLocalInput(stringValue(reservation.plannedCheckOutAt))} disabled={!canEditReservation} onCommit={(value) => onUpdateReservation('plannedCheckOutAt', value ? systemDateTimeLocalToIso(value) : null)} />}
        <EditableInfoCell label="Địa chỉ" value={guest?.address} wide onCommit={(value) => onUpdateGuest('address', value)} />
        <EditableInfoCell label="Ghi chú" type="textarea" value={reservation.note} wide disabled={!canEditReservation} onCommit={(value) => onUpdateReservation('note', value)} />
      </div>

      {canAddService && <section className="services-card" aria-labelledby="services-title">
          <div className="services-card__heading">
            <h3 id="services-title">Dịch vụ phát sinh</h3>
            <button type="button" className="outline-button outline-button--service" onClick={() => { resetServiceEditor(); setServiceFormOpen((open) => !open); }}>＋ Dịch vụ thêm</button>
          </div>
          {serviceFormOpen && (
            <form ref={serviceFormRef} className="service-form service-form--manual" onBlurCapture={scheduleServiceSave} onFocusCapture={() => {
              if (serviceBlurTimer.current !== undefined) window.clearTimeout(serviceBlurTimer.current);
            }} onSubmit={(event) => { event.preventDefault(); void saveService(); }}>
              <HotelField label="Tên dịch vụ" name="serviceName" required disabled={serviceSaving} value={serviceName} onValueChange={setServiceName} />
              <HotelField label="Đơn giá" name="serviceUnitPrice" required disabled={serviceSaving} value={serviceUnitPrice} inputMode="numeric" pattern="[1-9][0-9,]*" onValueChange={(value) => setServiceUnitPrice(formatVndAmountInput(value))} />
              <HotelField label="Số lượng" name="serviceQuantity" required disabled={serviceSaving} type="number" min="1" step="1" value={quantity} inputMode="numeric" onValueChange={setQuantity} />
              <HotelField label="Ghi chú" name="serviceNote" disabled={serviceSaving} value={serviceNote} onValueChange={setServiceNote} />
            </form>
          )}
          {servicesLoading ? <p className="service-empty">Đang tải dịch vụ…</p> : services.length === 0 && !serviceFormOpen ? <p className="service-empty">Chưa có dịch vụ</p> : services.length > 0 ? <div className="service-list">{services.map((service) => editingService?.id === service.id ? <form key={service.id} ref={serviceEditFormRef} className="service-form service-form--manual service-editor" onBlurCapture={scheduleEditedServiceSave} onFocusCapture={() => {
              if (serviceEditBlurTimer.current !== undefined) window.clearTimeout(serviceEditBlurTimer.current);
            }} onSubmit={(event) => { event.preventDefault(); void saveEditedService(); }}>
              <HotelField label="Tên dịch vụ" name="editServiceName" required disabled={serviceUpdating} value={editServiceName} onValueChange={setEditServiceName} />
              <HotelField label="Đơn giá" name="editServiceUnitPrice" required disabled={serviceUpdating} value={editServiceUnitPrice} inputMode="numeric" pattern="[1-9][0-9,]*" onValueChange={(value) => setEditServiceUnitPrice(formatVndAmountInput(value))} />
              <HotelField label="Số lượng" name="editServiceQuantity" required disabled={serviceUpdating} type="number" min="1" step="1" value={editServiceQuantity} inputMode="numeric" onValueChange={setEditServiceQuantity} />
              <HotelField label="Ghi chú" name="editServiceNote" disabled={serviceUpdating} value={editServiceNote} onValueChange={setEditServiceNote} />
            </form> : <button key={service.id} type="button" className="service-row service-row--editable" onClick={() => startServiceEdit(service)}><span>{service.name} × {service.quantity}</span><span className="service-row__amount"><strong>{formatCurrency(service.total)}</strong><em>Sửa</em></span></button>)}</div> : null}
        </section>}

      {paymentHistoryOpen && <section className="payment-history" aria-label="Lịch sử thanh toán"><h3>Lịch sử thanh toán</h3>{paymentsLoading ? <p className="service-empty">Đang tải lịch sử…</p> : payments.length === 0 ? <p className="service-empty">Chưa có thanh toán</p> : payments.map((payment) => <div className="payment-row" key={payment.id}><span>{payment.paymentType} · {payment.method}</span><strong>{formatCurrency(payment.amount)}</strong></div>)}</section>}
      {actionMessage && <p className="action-message" role="alert">{actionMessage}</p>}
      <div className="stay-actions">
        <button type="button" className="outline-button" onClick={() => setPaymentHistoryOpen((open) => !open)}>{paymentHistoryOpen ? 'Ẩn lịch sử' : 'Lịch sử thanh toán'}</button>
        <button type="button" className="danger-button" disabled={!canCheckout || checkoutPending} onClick={openCheckoutBill}>Trả phòng</button>
        {reservation.status === 'draft' && <button type="button" className="primary-button" disabled={confirmPending} onClick={onConfirm}>{confirmPending ? 'Đang xác nhận…' : 'Xác nhận đặt phòng'}</button>}
        <button type="button" className="outline-button" onClick={onBookNew}>Đặt phòng mới</button>
      </div>
      {checkoutBillOpen && <CheckoutBillModal
        guestName={guest?.fullName}
        roomNumber={roomNumber}
        preview={checkoutPreview}
        loading={checkoutPreviewLoading}
        services={services}
        servicesLoading={servicesLoading}
        payments={payments}
        pending={checkoutPending}
        error={checkoutError}
        onClose={() => setCheckoutBillOpen(false)}
        onConfirm={() => void confirmCheckout()}
      />}
    </section>
  );
}

function CheckoutBillModal({ guestName, roomNumber, preview, loading = false, services, servicesLoading = false, payments, pending = false, error, onClose, onConfirm }: {
  guestName?: string;
  roomNumber?: string;
  preview?: CheckoutPreview;
  loading?: boolean;
  services: ReservationService[];
  servicesLoading?: boolean;
  payments: Payment[];
  pending?: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const billReady = Boolean(preview) && !loading;
  const paymentRows = payments.filter((payment) => payment.status === 'completed');
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card checkout-bill" role="dialog" aria-modal="true" aria-labelledby="checkout-bill-title">
        <div className="modal-card__heading"><h3 id="checkout-bill-title">Bill trả phòng</h3><button type="button" className="modal-close" aria-label="Đóng bill trả phòng" disabled={pending} onClick={onClose}>×</button></div>
        <p className="modal-copy">{guestName || 'Khách lưu trú'} · Phòng {roomNumber || '—'}</p>
        {!preview ? <p className="service-empty">Đang lập bill từ dữ liệu Backend…</p> : <>
          <div className="checkout-bill__section">
            <div className="checkout-bill__row"><span>Tiền phòng{preview.chargedNights ? ` · ${preview.chargedNights} đêm` : ''}</span><strong>{formatCurrency(preview.roomAmount)}</strong></div>
            {servicesLoading ? <div className="checkout-bill__row checkout-bill__row--empty"><span>Đang tải dịch vụ</span><strong>—</strong></div> : services.length === 0 ? <div className="checkout-bill__row checkout-bill__row--empty"><span>Dịch vụ phát sinh</span><strong>{preview.serviceAmount > 0 ? formatCurrency(preview.serviceAmount) : '—'}</strong></div> : services.map((service) => <div className="checkout-bill__row" key={service.id}><span>{service.name} × {service.quantity}</span><strong>{formatCurrency(service.total)}</strong></div>)}
          </div>
          <div className="checkout-bill__section checkout-bill__totals">
            <div className="checkout-bill__row"><span>Tổng cộng</span><strong>{formatCurrency(preview.total)}</strong></div>
            <div className="checkout-bill__row"><span>Đã thanh toán{paymentRows.length ? ' (bao gồm cọc)' : ''}</span><strong>− {formatCurrency(preview.paidAmount)}</strong></div>
            <div className="checkout-bill__row checkout-bill__row--due"><span>Thanh toán khi trả phòng</span><strong>{formatCurrency(preview.balance)}</strong></div>
          </div>
          {loading && <p className="checkout-bill__updating">Đang cập nhật bill theo dữ liệu mới nhất…</p>}
          {preview.balance < 0 && <p className="modal-warning">Khoản thanh toán đang vượt tổng bill. Vui lòng xử lý hoàn tiền trước khi trả phòng.</p>}
        </>}
        {error && <p className="modal-warning" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="outline-button" disabled={pending} onClick={onClose}>Quay lại</button>
          <button type="button" className="danger-button checkout-bill__confirm" disabled={!billReady || (preview?.balance ?? 0) < 0 || pending} onClick={onConfirm}>{pending ? 'Đang xác nhận…' : 'Xác nhận thanh toán & trả phòng'}</button>
        </div>
      </section>
    </div>
  );
}

function InfoCell({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <HotelField label={label} value={value} wide={wide} readOnly />;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function formatDateTimeValue(value: unknown): string {
  const date = stringValue(value);
  return date ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date)) : '—';
}

function EditableInfoCell({ label, value, type = 'text', wide = false, disabled = false, onCommit }: { label: string; value?: string | null; type?: EditorType; wide?: boolean; disabled?: boolean; onCommit: (value: string) => Promise<void> }) {
  const normalizedValue = value ?? '';
  const [draft, setDraft] = useState(normalizedValue);
  const [focused, setFocused] = useState(false);
  const lastPropValue = useRef(normalizedValue);
  const commitSequence = useRef(0);

  useEffect(() => {
    if (!focused && normalizedValue !== lastPropValue.current) {
      setDraft(normalizedValue);
      lastPropValue.current = normalizedValue;
    }
  }, [focused, normalizedValue]);

  const commit = () => {
    setFocused(false);
    if (draft === normalizedValue) return;
    const nextValue = draft;
    const sequence = ++commitSequence.current;
    void onCommit(nextValue).then(() => {
      if (commitSequence.current === sequence) lastPropValue.current = nextValue;
    }).catch(() => {
      if (commitSequence.current === sequence) {
        lastPropValue.current = normalizedValue;
        setDraft(normalizedValue);
      }
    });
  };
  return (
    <HotelField
      label={label}
      value={draft}
      type={type === 'textarea' ? 'text' : type}
      multiline={type === 'textarea'}
      rows={2}
      wide={wide}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onValueChange={setDraft}
      onBlur={commit}
    />
  );
}
