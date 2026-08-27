-- Room turnover V1: a room becomes sellable again only after checkout and a
-- staff-confirmed housekeeping transition back to ready. Reservation drafts
-- are explicit room holds and therefore participate in overlap protection.

alter table public.reservations drop constraint if exists reservations_no_overlap;

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(planned_check_in_at, planned_check_out_at, '[)') with &&
  ) where (status in ('draft', 'confirmed', 'checked_in'));

create or replace function public.touch_reservation_financial_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation_id uuid;
  actor_id uuid;
begin
  if tg_op = 'DELETE' then
    target_reservation_id := old.reservation_id;
    actor_id := coalesce(old.updated_by, auth.uid());
  else
    target_reservation_id := new.reservation_id;
    actor_id := coalesce(new.updated_by, auth.uid());
  end if;

  update public.reservations
  set version = version + 1,
      updated_by = actor_id
  where id = target_reservation_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists payments_touch_reservation_version on public.payments;
create trigger payments_touch_reservation_version
after insert or update or delete on public.payments
for each row execute function public.touch_reservation_financial_version();

drop trigger if exists reservation_services_touch_reservation_version on public.reservation_services;
create trigger reservation_services_touch_reservation_version
after insert or update or delete on public.reservation_services
for each row execute function public.touch_reservation_financial_version();

create or replace function public.set_room_housekeeping_status(
  p_room_id uuid,
  p_status public.housekeeping_status,
  p_actor_id uuid
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  current_room public.rooms;
  updated_room public.rooms;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;

  select * into current_room
  from public.rooms
  where id = p_room_id and active = true
  for update;

  if current_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;

  update public.rooms
  set housekeeping_status = p_status,
      updated_by = p_actor_id
  where id = p_room_id
  returning * into updated_room;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (
    p_actor_id,
    'room.housekeeping.updated',
    'room',
    p_room_id,
    to_jsonb(current_room),
    to_jsonb(updated_room)
  );

  return updated_room;
end;
$$;

create or replace function public.check_in_reservation(
  p_reservation_id uuid,
  p_expected_version integer,
  p_actor_id uuid
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reservation public.reservations;
  current_room public.rooms;
  updated_reservation public.reservations;
  local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  planned_check_in_date date;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;

  select * into current_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if current_reservation.id is null then
    raise exception using errcode = 'P0002', message = 'Reservation was not found';
  end if;
  if current_reservation.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Reservation was changed by another user';
  end if;
  if current_reservation.status not in ('draft', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'Reservation cannot be checked in from its current status';
  end if;

  planned_check_in_date := (current_reservation.planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  if local_today < planned_check_in_date then
    raise exception using errcode = 'P0001', message = 'Check-in is before the planned check-in date';
  end if;

  select * into current_room
  from public.rooms
  where id = current_reservation.room_id and active = true
  for update;

  if current_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;
  if current_room.housekeeping_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'Room is not ready for check-in';
  end if;
  if exists (
    select 1
    from public.reservations other_reservation
    where other_reservation.room_id = current_reservation.room_id
      and other_reservation.id <> current_reservation.id
      and other_reservation.status = 'checked_in'
  ) then
    raise exception using errcode = 'P0001', message = 'Room turnover is pending';
  end if;

  update public.reservations
  set status = 'checked_in',
      actual_check_in_at = now(),
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id and version = p_expected_version
  returning * into updated_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (p_actor_id, 'reservation.checked_in', 'reservation', p_reservation_id, to_jsonb(current_reservation), to_jsonb(updated_reservation));

  return updated_reservation;
end;
$$;

create or replace function public.checkout_reservation(
  p_reservation_id uuid,
  p_expected_version integer,
  p_actor_id uuid
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reservation public.reservations;
  updated_reservation public.reservations;
  current_room public.rooms;
  updated_room public.rooms;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;

  select * into current_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if current_reservation.id is null then
    raise exception using errcode = 'P0002', message = 'Reservation was not found';
  end if;
  if current_reservation.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Reservation was changed by another user';
  end if;
  if current_reservation.status <> 'checked_in' then
    raise exception using errcode = 'P0001', message = 'Only checked-in reservations can be checked out';
  end if;

  select * into current_room
  from public.rooms
  where id = current_reservation.room_id
  for update;

  if current_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;

  update public.reservations
  set status = 'checked_out',
      actual_check_out_at = now(),
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id and version = p_expected_version
  returning * into updated_reservation;

  update public.rooms
  set housekeeping_status = 'cleaning',
      updated_by = p_actor_id
  where id = current_room.id
  returning * into updated_room;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (
    p_actor_id,
    'reservation.checked_out',
    'reservation',
    p_reservation_id,
    jsonb_build_object('reservation', to_jsonb(current_reservation), 'room', to_jsonb(current_room)),
    jsonb_build_object('reservation', to_jsonb(updated_reservation), 'room', to_jsonb(updated_room))
  );

  return updated_reservation;
end;
$$;

create or replace function public.create_stay(
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
  if room_record.housekeeping_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'Room is not ready for intake';
  end if;
  if exists (
    select 1
    from public.reservations other_reservation
    where other_reservation.room_id = p_room_id
      and other_reservation.status = 'checked_in'
  ) then
    raise exception using errcode = 'P0001', message = 'Room turnover is pending';
  end if;
  if p_mode = 'advance' and exists (
    select 1
    from public.reservations turnover_reservation
    where turnover_reservation.room_id = p_room_id
      and turnover_reservation.status in ('draft', 'confirmed', 'checked_in')
      and (turnover_reservation.planned_check_out_at at time zone 'Asia/Ho_Chi_Minh')::date = check_in_date
      and turnover_reservation.planned_check_out_at <= p_planned_check_in_at
  ) then
    raise exception using errcode = 'P0001', message = 'Room turnover is pending';
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

  select * into reservation_record
  from public.reservations
  where id = reservation_record.id;

  return jsonb_build_object(
    'action', p_mode,
    'reservation', to_jsonb(reservation_record),
    'guest', to_jsonb(guest_record)
  );
end;
$$;

revoke execute on function public.set_room_housekeeping_status(uuid, public.housekeeping_status, uuid) from public;
revoke execute on function public.checkout_reservation(uuid, integer, uuid) from public;
grant execute on function public.set_room_housekeeping_status(uuid, public.housekeeping_status, uuid) to authenticated;
grant execute on function public.checkout_reservation(uuid, integer, uuid) to authenticated;
