'use client';

import { useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { HotelField } from '../../components/ui/hotel-field';
import type { CheckInRoomDto, Room } from '../../lib/api/api-client';
import { formatVndAmountInput, parseVndAmountInput, systemDateTimeLocalToIso } from '../calendar/calendar-utils';

type DocumentType = 'national_id' | 'passport';

interface GuestDraft {
  key: string;
  documentType: DocumentType;
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  address: string;
  documentIssuedAt: string;
  nationality: string;
}

interface CheckInRoomModalProps {
  room: Room;
  isPending?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onCheckIn: (body: CheckInRoomDto) => void;
}

/**
 * The walk-in flow deliberately starts with one clear act: select an available
 * room. This modal collects the people who will actually stay in that room and
 * submits them atomically only when the receptionist confirms check-in.
 */
export function CheckInRoomModal({ room, isPending = false, errorMessage, onClose, onCheckIn }: CheckInRoomModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const nextGuestId = useRef(1);
  const [guests, setGuests] = useState<GuestDraft[]>([newGuest('primary')]);
  const [roomRatePerNight, setRoomRatePerNight] = useState(() => formatVndAmountInput(room.defaultNightlyRate));
  const [plannedCheckOutAt, setPlannedCheckOutAt] = useState('');
  const [note, setNote] = useState('');

  const updateGuest = (key: string, field: keyof Omit<GuestDraft, 'key'>, value: string) => {
    setGuests((current) => current.map((guest) => guest.key === key ? { ...guest, [field]: value } : guest));
  };

  const changeDocumentType = (key: string, documentType: DocumentType) => {
    setGuests((current) => current.map((guest) => {
      if (guest.key !== key || guest.documentType === documentType) return guest;
      return {
        ...guest,
        documentType,
        documentIssuedAt: '',
        nationality: documentType === 'passport' ? guest.nationality : '',
      };
    }));
  };

  const addCompanion = () => {
    const key = `companion-${nextGuestId.current}`;
    nextGuestId.current += 1;
    setGuests((current) => [...current, newGuest(key)]);
  };

  const removeCompanion = (key: string) => setGuests((current) => current.filter((guest) => guest.key !== key));

  const submit = () => {
    if (isPending || !formRef.current?.reportValidity()) return;
    const roomRate = parseVndAmountInput(roomRatePerNight);
    const checkOutAt = plannedCheckOutAt ? systemDateTimeLocalToIso(plannedCheckOutAt) : null;
    if (!roomRate || roomRate < 1 || (plannedCheckOutAt && !checkOutAt)) return;

    onCheckIn({
      roomId: room.id,
      roomRatePerNight: roomRate,
      guests: guests.map((guest) => ({
        documentType: guest.documentType,
        fullName: guest.fullName.trim(),
        documentNumber: guest.documentNumber.trim(),
        dateOfBirth: guest.dateOfBirth,
        address: guest.address.trim(),
        ...(guest.documentType === 'national_id'
          ? { documentIssuedAt: guest.documentIssuedAt }
          : { nationality: guest.nationality.trim() }),
      })),
      ...(checkOutAt ? { plannedCheckOutAt: checkOutAt } : { plannedCheckOutAt: null }),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card check-in-modal" role="dialog" aria-modal="true" aria-labelledby="check-in-room-title">
        <div className="modal-card__heading">
          <div>
            <h3 id="check-in-room-title">Nhận khách · Phòng {room.roomNumber}</h3>
            <p className="check-in-modal__room-type">{room.bedCount} giường · {room.hasWindow ? 'Có cửa sổ' : 'Không cửa sổ'}</p>
          </div>
          <button type="button" className="modal-close" aria-label="Đóng" disabled={isPending} onClick={onClose}>×</button>
        </div>

        <form ref={formRef} className="check-in-modal__form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="check-in-modal__stay-grid">
            <HotelField
              label="Tiền phòng / đêm"
              name="roomRatePerNight"
              required
              value={roomRatePerNight}
              inputMode="numeric"
              autoComplete="off"
              pattern="[1-9][0-9,]*"
              onValueChange={(value) => setRoomRatePerNight(formatVndAmountInput(value))}
            />
            <HotelField
              label="Dự kiến trả"
              name="plannedCheckOutAt"
              type="datetime-local"
              value={plannedCheckOutAt}
              onValueChange={setPlannedCheckOutAt}
            />
            <HotelField label="Ghi chú" name="note" value={note} multiline rows={2} wide onValueChange={setNote} />
          </div>

          <div className="check-in-modal__guest-heading">
            <div>
              <h4>Khách lưu trú</h4>
              <p>Nhập thông tin từng người sẽ ở trong phòng.</p>
            </div>
            <Button type="button" className="check-in-modal__add-guest" variant="secondary" isDisabled={isPending} onPress={addCompanion}>+ Thêm khách</Button>
          </div>

          <div className="check-in-modal__guest-list">
            {guests.map((guest, index) => {
              const isPrimary = index === 0;
              const isPassport = guest.documentType === 'passport';
              return (
                <fieldset className="check-in-modal__guest-card" key={guest.key}>
                  <legend className="check-in-modal__guest-card-heading">
                    <span>{isPrimary ? 'Khách chính' : `Khách cùng phòng ${index}`}</span>
                    {!isPrimary && <button type="button" className="check-in-modal__remove-guest" disabled={isPending} onClick={() => removeCompanion(guest.key)}>Xóa</button>}
                  </legend>
                  <div className="check-in-modal__document-switch" aria-label={`Loại giấy tờ của ${isPrimary ? 'khách chính' : `khách ${index}`} `}>
                    <Button type="button" className={guest.documentType === 'national_id' ? 'check-in-modal__document-button check-in-modal__document-button--active' : 'check-in-modal__document-button'} variant="secondary" isDisabled={isPending} onPress={() => changeDocumentType(guest.key, 'national_id')}>Căn cước</Button>
                    <Button type="button" className={isPassport ? 'check-in-modal__document-button check-in-modal__document-button--active' : 'check-in-modal__document-button'} variant="secondary" isDisabled={isPending} onPress={() => changeDocumentType(guest.key, 'passport')}>Hộ chiếu</Button>
                  </div>
                  <div className="check-in-modal__guest-grid">
                    <HotelField label="Họ và tên" name={`${guest.key}-fullName`} required value={guest.fullName} autoComplete="name" onValueChange={(value) => updateGuest(guest.key, 'fullName', value)} />
                    <HotelField label={isPassport ? 'Số hộ chiếu' : 'Số CCCD'} name={`${guest.key}-documentNumber`} required value={guest.documentNumber} autoComplete="off" onValueChange={(value) => updateGuest(guest.key, 'documentNumber', value)} />
                    <HotelField label="Ngày sinh" name={`${guest.key}-dateOfBirth`} type="date" required value={guest.dateOfBirth} onValueChange={(value) => updateGuest(guest.key, 'dateOfBirth', value)} />
                    {isPassport ? (
                      <HotelField label="Quốc tịch" name={`${guest.key}-nationality`} required value={guest.nationality} autoComplete="country-name" onValueChange={(value) => updateGuest(guest.key, 'nationality', value)} />
                    ) : (
                      <HotelField label="Ngày cấp" name={`${guest.key}-documentIssuedAt`} type="date" required value={guest.documentIssuedAt} onValueChange={(value) => updateGuest(guest.key, 'documentIssuedAt', value)} />
                    )}
                    <HotelField label="Địa chỉ" name={`${guest.key}-address`} required value={guest.address} wide onValueChange={(value) => updateGuest(guest.key, 'address', value)} />
                  </div>
                </fieldset>
              );
            })}
          </div>

          {errorMessage && <p className="action-message action-message--warning" role="alert">{errorMessage}</p>}
          <div className="modal-actions check-in-modal__actions">
            <Button type="button" className="outline-button" variant="secondary" isDisabled={isPending} onPress={onClose}>Hủy</Button>
            <Button type="submit" className="primary-button check-in-modal__confirm" isDisabled={isPending}>{isPending ? 'Đang nhận phòng…' : 'Nhận phòng'}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function newGuest(key: string): GuestDraft {
  return {
    key,
    documentType: 'national_id',
    fullName: '',
    documentNumber: '',
    dateOfBirth: '',
    address: '',
    documentIssuedAt: '',
    nationality: '',
  };
}
