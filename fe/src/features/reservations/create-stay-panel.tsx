'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { HotelField } from '../../components/ui/hotel-field';
import type { CreateStayDto, Room } from '../../lib/api/api-client';
import { formatVndAmountInput, parseVndAmountInput, systemDateTimeLocalToIso } from '../calendar/calendar-utils';

type IntakeAction = CreateStayDto['action'];

interface IntakePolicy {
  date: string;
  localDate: string;
  localTime: string;
  allowCheckIn: boolean;
  allowAdvanceReservation: boolean;
  defaultAction: 'check_in' | 'advance' | 'none';
}

interface CreateStayPanelProps {
  room: Room;
  selectedDate: string;
  policy?: IntakePolicy;
  policyLoading?: boolean;
  isPending?: boolean;
  allowUnavailableRoom?: boolean;
  actionMessage?: string;
  onCreate: (body: CreateStayDto) => void;
}

interface FormState {
  fullName: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  idIssuedDate: string;
  address: string;
  plannedCheckInAt: string;
  plannedCheckOutAt: string;
  roomRatePerNight: string;
  depositAmount: string;
  note: string;
}

export function CreateStayPanel({ room, selectedDate, policy, policyLoading = false, isPending = false, allowUnavailableRoom = false, actionMessage, onCreate }: CreateStayPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const policyDefaultAction = defaultAction(policy, room, allowUnavailableRoom);
  const defaults = useMemo(() => defaultForm(selectedDate, policyDefaultAction, room.defaultNightlyRate), [policyDefaultAction, room.defaultNightlyRate, selectedDate]);
  const [form, setForm] = useState<FormState>(defaults);
  const [action, setAction] = useState<IntakeAction>(policyDefaultAction);

  useEffect(() => {
    setForm(defaults);
    setAction(policyDefaultAction);
  }, [defaults, policyDefaultAction]);

  const canCreateStay = room.canCreateStay;
  const canCreateAdvance = room.canCreateAdvance;
  const roomAvailable = allowUnavailableRoom || canCreateStay || canCreateAdvance;
  const allowCheckIn = Boolean(policy?.allowCheckIn && (allowUnavailableRoom || canCreateStay));
  const allowAdvanceReservation = Boolean(policy?.allowAdvanceReservation && (allowUnavailableRoom || canCreateAdvance));
  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const selectAction = (nextAction: IntakeAction) => {
    if (nextAction === action) return;
    setAction(nextAction);
    setForm((current) => ({
      ...current,
      ...stayDates(selectedDate, nextAction),
    }));
  };

  const handleAction = (nextAction: IntakeAction) => {
    if (nextAction !== action) {
      selectAction(nextAction);
      return;
    }
    submit();
  };

  const submit = () => {
    if (!formRef.current?.reportValidity() || isPending) return;
    const checkInAt = systemDateTimeLocalToIso(form.plannedCheckInAt);
    const checkOutAt = form.plannedCheckOutAt ? systemDateTimeLocalToIso(form.plannedCheckOutAt) : null;
    const roomRatePerNight = parseVndAmountInput(form.roomRatePerNight);
    const depositAmount = parseVndAmountInput(form.depositAmount);
    if (!checkInAt || (form.plannedCheckOutAt && !checkOutAt) || !roomRatePerNight || roomRatePerNight < 1) return;
    onCreate({
      roomId: room.id,
      action,
      assignmentMode: 'exact',
      guest: {
        fullName: form.fullName.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.idNumber.trim() ? { idNumber: form.idNumber.trim() } : {}),
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.idIssuedDate ? { idIssuedDate: form.idIssuedDate } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      },
      plannedCheckInAt: checkInAt,
      ...(checkOutAt ? { plannedCheckOutAt: checkOutAt } : { plannedCheckOutAt: null }),
      roomRatePerNight,
      ...(action === 'advance' && depositAmount !== null ? { depositAmount } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    });
  };

  return (
    <section className="stay-panel intake-panel" aria-labelledby="intake-title">
      <h2 id="intake-title">Thông tin phòng · {room.roomNumber}</h2>
      <p className="intake-room-type">Loại phòng: {room.roomTypeName}</p>

      <form ref={formRef} className="intake-form">
        <div className="intake-section-title">Thông tin khách</div>
        <div className="intake-grid intake-grid--two">
          <HotelField label="Tên khách" name="fullName" required value={form.fullName} onValueChange={(value) => update('fullName', value)} />
          <HotelField label="Số điện thoại" name="phone" type="tel" value={form.phone} onValueChange={(value) => update('phone', value)} />
          <HotelField label="Số CCCD" name="idNumber" value={form.idNumber} onValueChange={(value) => update('idNumber', value)} />
          <HotelField label="Ngày sinh" name="dateOfBirth" type="date" value={form.dateOfBirth} onValueChange={(value) => update('dateOfBirth', value)} />
          <HotelField label="Ngày cấp CCCD" name="idIssuedDate" type="date" value={form.idIssuedDate} onValueChange={(value) => update('idIssuedDate', value)} />
          <HotelField label="Địa chỉ" name="address" value={form.address} onValueChange={(value) => update('address', value)} />
        </div>

        <div className="intake-section-title">Thông tin lưu trú</div>
        <div className="intake-grid intake-grid--two">
          <HotelField label="Ngày nhận" name="plannedCheckInAt" required type="datetime-local" value={form.plannedCheckInAt} onValueChange={(value) => update('plannedCheckInAt', value)} />
          <HotelField label="Dự kiến trả (tùy chọn)" name="plannedCheckOutAt" type="datetime-local" value={form.plannedCheckOutAt} onValueChange={(value) => update('plannedCheckOutAt', value)} />
          <HotelField label="Tiền phòng / đêm" name="roomRatePerNight" required value={form.roomRatePerNight} inputMode="numeric" autoComplete="off" pattern="[1-9][0-9,]*" onValueChange={(value) => update('roomRatePerNight', formatVndAmountInput(value))} />
          {action === 'advance' && <HotelField label="Tiền cọc" name="depositAmount" value={form.depositAmount} inputMode="numeric" autoComplete="off" pattern="[0-9,]*" onValueChange={(value) => update('depositAmount', formatVndAmountInput(value))} />}
          <HotelField label="Ghi chú" name="note" value={form.note} wide onValueChange={(value) => update('note', value)} />
        </div>

        {policyLoading && <p className="inline-api-warning">Đang kiểm tra thao tác phù hợp với thời điểm hiện tại…</p>}
        {!roomAvailable && <p className="inline-api-warning">{room.unavailableReason || 'Phòng chưa sẵn sàng nên chưa thể tạo lưu trú.'}</p>}
        {allowUnavailableRoom && <p className="intake-hint">Phòng này chỉ là ưu tiên. Hệ thống sẽ kiểm tra và đề xuất phòng tương đương trước khi tạo.</p>}
        {actionMessage && <p className="action-message action-message--warning" role="alert">{actionMessage}</p>}
        <div className={`intake-actions${allowCheckIn && allowAdvanceReservation ? ' intake-actions--dual' : ''}`}>
          {allowCheckIn && <Button type="button" className="intake-action intake-action--check-in" isDisabled={isPending} onPress={() => handleAction('check_in')}>{isPending && action === 'check_in' ? 'Đang xử lý…' : 'Nhận phòng ngay'}</Button>}
          {allowAdvanceReservation && <Button type="button" className="intake-action intake-action--advance" isDisabled={isPending} onPress={() => handleAction('advance')}>{isPending && action === 'advance' ? 'Đang xử lý…' : 'Đặt phòng trước'}</Button>}
          {!policyLoading && !allowCheckIn && !allowAdvanceReservation && <p className="inline-api-warning">{room.unavailableReason || 'Ngày đã chọn không thể tạo lưu trú.'}</p>}
        </div>
      </form>
    </section>
  );
}

function defaultForm(selectedDate: string, action: IntakeAction, defaultNightlyRate: number | null): FormState {
  const dates = stayDates(selectedDate, action);
  return {
    fullName: '', phone: '', idNumber: '', dateOfBirth: '', idIssuedDate: '', address: '',
    ...dates,
    plannedCheckOutAt: '',
    roomRatePerNight: formatVndAmountInput(defaultNightlyRate), depositAmount: '', note: '',
  };
}

function defaultAction(policy: IntakePolicy | undefined, room: Room, allowUnavailableRoom: boolean): IntakeAction {
  if (policy?.allowCheckIn && (allowUnavailableRoom || room.canCreateStay)) return 'check_in';
  return 'advance';
}

function stayDates(selectedDate: string, action: IntakeAction): Pick<FormState, 'plannedCheckInAt'> {
  const checkInAt = action === 'check_in' ? localNowInput() : `${selectedDate}T14:00`;
  return {
    plannedCheckInAt: checkInAt,
  };
}

function localNowInput(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
