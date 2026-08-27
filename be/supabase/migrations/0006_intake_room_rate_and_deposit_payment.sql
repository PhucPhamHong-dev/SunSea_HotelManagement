-- Intake v2: the receptionist supplies an immutable nightly-rate snapshot.
-- An optional advance-reservation deposit is a real completed payment, not a
-- reservation-level estimate. The PostgreSQL function remains one transaction.

drop function if exists public.create_stay(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, numeric, text, uuid);

create function public.create_stay(
  p_room_id uuid,
  p_guest_full_name text,
  p_guest_phone text,
  p_guest_id_number text,
  p_guest_date_of_birth date,
  p_guest_id_issued_date date,
  p_guest_address text,
  p_planned_check_in_at timestamptz,
  p_planned_check_out_at timestamptz,
  p_mode text,
  p_room_rate_per_night numeric,
  p_deposit_amount numeric default 0,
  p_note text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  room_record public.rooms;
  guest_record public.guests;
  reservation_record public.reservations;
  deposit_payment_record public.payments;
  local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  local_hour integer := extract(hour from (now() at time zone 'Asia/Ho_Chi_Minh'))::integer;
  check_in_date date := (p_planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if auth.uid() is null or p_actor_id is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;

  if nullif(trim(p_guest_full_name), '') is null then
    raise exception using errcode = '22023', message = 'Guest name is required';
  end if;
  if p_planned_check_out_at <= p_planned_check_in_at then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if p_room_rate_per_night is null or p_room_rate_per_night <= 0 or p_room_rate_per_night <> trunc(p_room_rate_per_night) then
    raise exception using errcode = '22023', message = 'Nightly room rate must be a positive integer amount';
  end if;
  if coalesce(p_deposit_amount, 0) < 0 or coalesce(p_deposit_amount, 0) <> trunc(coalesce(p_deposit_amount, 0)) then
    raise exception using errcode = '22023', message = 'Deposit amount must be a non-negative integer amount';
  end if;
  if p_mode not in ('check_in', 'advance') then
    raise exception using errcode = '22023', message = 'Unsupported intake action';
  end if;
  if p_mode <> 'advance' and coalesce(p_deposit_amount, 0) > 0 then
    raise exception using errcode = '22023', message = 'Deposit is only available for an advance reservation';
  end if;
  if p_mode = 'check_in' and check_in_date <> local_today then
    raise exception using errcode = 'P0001', message = 'Check-in is only available for today';
  end if;
  if p_mode = 'advance' and check_in_date < local_today then
    raise exception using errcode = 'P0001', message = 'Advance reservation cannot start in the past';
  end if;
  if p_mode = 'advance' and check_in_date = local_today and local_hour >= 12 then
    raise exception using errcode = 'P0001', message = 'Advance reservation for today is closed after 12:00';
  end if;

  select * into room_record
  from public.rooms
  where id = p_room_id and active = true
  for update;

  if room_record.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;
  if room_record.housekeeping_status = 'out_of_service' then
    raise exception using errcode = 'P0001', message = 'Room is out of service';
  end if;

  insert into public.guests (
    full_name, phone, id_number, date_of_birth, id_issued_date, address, created_by, updated_by
  ) values (
    trim(p_guest_full_name), nullif(trim(p_guest_phone), ''), nullif(trim(p_guest_id_number), ''),
    p_guest_date_of_birth, p_guest_id_issued_date, nullif(trim(p_guest_address), ''), p_actor_id, p_actor_id
  ) returning * into guest_record;

  insert into public.reservations (
    room_id, guest_id, planned_check_in_at, planned_check_out_at, actual_check_in_at,
    status, room_rate_snapshot, deposit_expected, note, created_by, updated_by
  ) values (
    p_room_id, guest_record.id, p_planned_check_in_at, p_planned_check_out_at,
    case when p_mode = 'check_in' then now() else null end,
    case when p_mode = 'check_in' then 'checked_in'::public.reservation_status else 'confirmed'::public.reservation_status end,
    p_room_rate_per_night, 0, nullif(trim(p_note), ''), p_actor_id, p_actor_id
  ) returning * into reservation_record;

  insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
  values (
    p_actor_id,
    case when p_mode = 'check_in' then 'reservation.checked_in' else 'reservation.created' end,
    'reservation', reservation_record.id,
    jsonb_build_object('reservation', to_jsonb(reservation_record), 'guest', to_jsonb(guest_record))
  );

  if p_mode = 'advance' and coalesce(p_deposit_amount, 0) > 0 then
    insert into public.payments (
      reservation_id, payment_type, amount, method, status, paid_at, note, created_by, updated_by
    ) values (
      reservation_record.id, 'deposit'::public.payment_type, p_deposit_amount,
      'other'::public.payment_method, 'completed'::public.payment_status, now(),
      'Tiền cọc ghi nhận khi tạo đặt phòng', p_actor_id, p_actor_id
    ) returning * into deposit_payment_record;

    insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
    values (
      p_actor_id, 'payment.created', 'payment', deposit_payment_record.id,
      jsonb_build_object('payment', to_jsonb(deposit_payment_record), 'reservationId', reservation_record.id)
    );
  end if;

  return jsonb_build_object(
    'action', p_mode,
    'reservation', to_jsonb(reservation_record),
    'guest', to_jsonb(guest_record)
  );
end;
$$;

revoke execute on function public.create_stay(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, numeric, numeric, text, uuid) from public;
grant execute on function public.create_stay(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, numeric, numeric, text, uuid) to authenticated;
