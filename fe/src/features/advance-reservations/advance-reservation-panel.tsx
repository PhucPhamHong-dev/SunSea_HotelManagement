'use client';

import { useState } from 'react';
import { HotelField } from '../../components/ui/hotel-field';
import type { AdvanceReservationDetailDto, Payment } from '../../lib/api/api-client';
import { formatCurrency, formatDateTime } from '../calendar/calendar-utils';

interface AdvanceReservationPanelProps {
  detail?: AdvanceReservationDetailDto;
  payments: Payment[];
  paymentsLoading?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onCancel: (reason: string) => void;
  onCheckIn: () => void;
  cancelPending?: boolean;
  checkInPending?: boolean;
  actionMessage?: string;
  onBookNew: () => void;
}

export function AdvanceReservationPanel({ detail, payments, paymentsLoading = false, isLoading = false, isError = false, onCancel, onCheckIn, cancelPending = false, checkInPending = false, actionMessage, onBookNew }: AdvanceReservationPanelProps) {
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) return <section className="stay-panel advance-detail-panel"><h2>Khách đặt trước</h2><div className="stay-empty">Đang tải chi tiết đặt phòng…</div></section>;
  if (isError || !detail) return <section className="stay-panel advance-detail-panel"><h2>Khách đặt trước</h2><div className="stay-empty">Không thể tải chi tiết đặt phòng từ backend.</div></section>;

  const statusLabel = detail.reservationStatus === 'confirmed' || detail.reservationStatus === 'draft' ? 'Đặt trước' : detail.reservationStatus;
  const depositPaid = detail.depositPaidAmount > 0;
  const roomAssignment = detail.roomNumber
    ? `Phòng ${detail.roomNumber}`
    : `Chưa xếp phòng · ${detail.roomTypeName}${detail.preferredRoomNumber ? ` · ưu tiên ${detail.preferredRoomNumber}` : ''}`;
  const submitCancel = () => {
    if (!cancelReason.trim() || cancelPending) return;
    onCancel(cancelReason.trim());
    setCancelOpen(false);
    setCancelReason('');
  };

  return (
    <section className="stay-panel advance-detail-panel" aria-labelledby="advance-detail-title">
      <h2 id="advance-detail-title">Khách đặt trước: {detail.guestName || '—'}</h2>
      <div className="hotel-field-grid hotel-field-grid--advance">
        <DetailCell label="Phòng" value={roomAssignment} />
        <DetailCell label="Ngày nhận" value={formatDateTime(detail.checkInAt)} />
        <DetailCell label="Dự kiến trả" value={detail.isOpenEnded ? 'Chưa xác định' : formatDateTime(stringValue(detail.checkOutAt))} />
        <DetailCell label="Trạng thái" value={statusLabel} />
        <DetailCell label="Giá phòng" value={`${formatCurrency(detail.roomPriceAmount)}/đêm`} />
        <DetailCell label="Tổng dự kiến" value={detail.isOpenEnded ? 'Chưa xác định' : formatCurrency(detail.estimatedRoomAmount)} />
        <DetailCell label="Tiền cọc" value={depositPaid ? `Đã cọc · ${formatCurrency(detail.depositPaidAmount)}` : 'Chưa cọc'} />
        <DetailCell label="Còn lại" value={detail.isOpenEnded ? 'Chưa xác định' : formatCurrency(detail.remainingAmount)} />
        <DetailCell label="Liên hệ" value={detail.contactPhone || '—'} />
        <DetailCell label="Ghi chú" value={detail.note || '—'} wide />
      </div>

      {detail.checkInBlockedReason && <p className="action-message action-message--warning" role="status">{detail.checkInBlockedReason}</p>}
      {actionMessage && <p className="action-message" role="alert">{actionMessage}</p>}

      <div className="advance-actions">
        <button type="button" className="outline-button" onClick={() => setPaymentHistoryOpen(true)}>Lịch sử thanh toán</button>
        <button type="button" className="danger-button" disabled={!detail.canCancel || cancelPending} onClick={() => setCancelOpen(true)}>{cancelPending ? 'Đang hủy…' : 'Hủy đặt phòng'}</button>
        <button type="button" className="primary-button" disabled={!detail.canCheckIn || checkInPending} onClick={() => setCheckInOpen(true)}>{checkInPending ? 'Đang nhận phòng…' : 'Nhận phòng'}</button>
        <button type="button" className="outline-button" onClick={onBookNew}>Đặt phòng mới</button>
      </div>

      {paymentHistoryOpen && (
        <Modal title="Lịch sử thanh toán" onClose={() => setPaymentHistoryOpen(false)}>
          {paymentsLoading ? <p className="service-empty">Đang tải lịch sử…</p> : payments.length === 0 ? <p className="service-empty">Chưa ghi nhận khoản thanh toán nào</p> : (
            <div className="payment-history-list">
              {payments.map((payment) => <div className="payment-history-item" key={payment.id}>
                <div><strong>{payment.paymentType}</strong><span>{payment.method} · {payment.status}</span></div>
                <div><strong>{formatCurrency(payment.amount)}</strong><span>{formatDateTime(textValue(payment.paidAt))}</span></div>
                {textValue(payment.note) && <p>{textValue(payment.note)}</p>}
                {textValue(payment.voidReason) && <p>Lý do vô hiệu: {textValue(payment.voidReason)}</p>}
              </div>)}
            </div>
          )}
        </Modal>
      )}

      {cancelOpen && (
        <Modal title="Hủy đặt phòng" onClose={() => setCancelOpen(false)}>
          <p className="modal-copy">Vui lòng nhập lý do hủy đặt phòng.</p>
          {depositPaid && <p className="modal-warning">Đặt phòng này đã ghi nhận tiền cọc. Việc hoàn hoặc xử lý tiền cọc sẽ được quản lý trong lịch sử thanh toán.</p>}
          <label className="modal-field">Lý do hủy<textarea rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} autoFocus /></label>
          <div className="modal-actions"><button type="button" className="outline-button" onClick={() => setCancelOpen(false)}>Đóng</button><button type="button" className="danger-button" disabled={!cancelReason.trim() || cancelPending} onClick={submitCancel}>{cancelPending ? 'Đang hủy…' : 'Xác nhận hủy'}</button></div>
        </Modal>
      )}

      {checkInOpen && (
        <Modal title="Xác nhận nhận phòng" onClose={() => setCheckInOpen(false)}>
          <p className="modal-copy">Xác nhận khách <strong>{detail.guestName}</strong> đã đến và nhận {detail.roomNumber ? <>phòng <strong>{detail.roomNumber}</strong></> : <>một phòng {detail.roomTypeName.toLocaleLowerCase()} phù hợp</>}?</p>
          <div className="modal-summary"><span>Tiền cọc</span><strong>{formatCurrency(detail.depositPaidAmount)}</strong><span>Số tiền còn lại</span><strong>{formatCurrency(detail.remainingAmount)}</strong></div>
          <div className="modal-actions"><button type="button" className="outline-button" onClick={() => setCheckInOpen(false)}>Đóng</button><button type="button" className="primary-button" disabled={checkInPending} onClick={() => { onCheckIn(); setCheckInOpen(false); }}>{checkInPending ? 'Đang xử lý…' : 'Xác nhận nhận phòng'}</button></div>
        </Modal>
      )}
    </section>
  );
}

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function DetailCell({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <HotelField label={label} value={value} wide={wide} readOnly />;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-card__heading"><h3 id="modal-title">{title}</h3><button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">×</button></div>{children}</section></div>;
}
