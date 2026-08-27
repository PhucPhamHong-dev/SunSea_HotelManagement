-- Open-ended stays, exact room equivalence and safe automatic reallocation.
-- A NULL planned checkout represents an open stay/reservation and is treated
-- as an interval ending at PostgreSQL's infinity timestamp.

alter table public.rooms
  add column if not exists has_window boolean not null default false;

update public.rooms
set has_window = room_number in ('102', '202', '302');

alter table public.reservations
  alter column planned_check_out_at drop not null;

alter table public.reservations
  drop constraint if exists reservations_check;

alter table public.reservations
  add constraint reservations_check
  check (
    planned_check_out_at is null
    or planned_check_out_at > planned_check_in_at
  );

alter table public.reservations
  drop constraint if exists reservations_no_overlap;

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(
      planned_check_in_at,
      coalesce(planned_check_out_at, 'infinity'::timestamptz),
      '[)'
    ) with &&
  ) where (status in ('draft', 'confirmed', 'checked_in'));

create index if not exists rooms_equivalence_idx
  on public.rooms (bed_count, has_window, floor_id, room_number)
  where active = true;

-- Intake retains its existing function signature, but accepts NULL checkout
-- and lets the exclusion constraint retain the selected room indefinitely.
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
  if p_planned_check_out_at is not null and p_planned_check_out_at <= p_planned_check_in_at then
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
  if p_mode = 'check_in' and exists (
    select 1 from public.reservations existing_stay
    where existing_stay.room_id = p_room_id and existing_stay.status = 'checked_in'
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

  return jsonb_build_object(
    'action', p_mode,
    'reservation', to_jsonb(reservation_record),
    'guest', to_jsonb(guest_record)
  );
end;
$$;

-- Extending an active stay can displace only future reservations. Each
-- displaced reservation is moved to an exactly-equivalent ready room. If any
-- candidate does not exist, this function raises and the whole transaction is
-- rolled back: neither the extension nor any partial reallocation persists.
create or replace function public.update_open_stay_checkout(
  p_reservation_id uuid,
  p_expected_version integer,
  p_planned_check_out_at timestamptz,
  p_update_note boolean,
  p_note text,
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
  conflicting_reservation public.reservations;
  matching_room public.rooms;
  moved_reservation public.reservations;
  updated_reservation public.reservations;
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
    raise exception using errcode = 'P0001', message = 'Only checked-in stays can extend an open checkout';
  end if;
  if p_planned_check_out_at is not null and p_planned_check_out_at <= current_reservation.planned_check_in_at then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;

  select * into current_room
  from public.rooms
  where id = current_reservation.room_id
  for update;

  if current_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;

  for conflicting_reservation in
    select other_reservation.*
    from public.reservations other_reservation
    where other_reservation.room_id = current_reservation.room_id
      and other_reservation.id <> current_reservation.id
      and other_reservation.status in ('draft', 'confirmed')
      and tstzrange(
        other_reservation.planned_check_in_at,
        coalesce(other_reservation.planned_check_out_at, 'infinity'::timestamptz),
        '[)'
      ) && tstzrange(
        current_reservation.planned_check_in_at,
        coalesce(p_planned_check_out_at, 'infinity'::timestamptz),
        '[)'
      )
    order by other_reservation.planned_check_in_at asc, other_reservation.created_at asc
    for update
  loop
    select candidate.* into matching_room
    from public.rooms candidate
    where candidate.active = true
      and candidate.housekeeping_status = 'ready'
      and candidate.id <> current_room.id
      and candidate.bed_count = current_room.bed_count
      and candidate.has_window = current_room.has_window
      and not exists (
        select 1
        from public.reservations assigned_reservation
        where assigned_reservation.room_id = candidate.id
          and assigned_reservation.id <> conflicting_reservation.id
          and assigned_reservation.status in ('draft', 'confirmed', 'checked_in')
          and tstzrange(
            assigned_reservation.planned_check_in_at,
            coalesce(assigned_reservation.planned_check_out_at, 'infinity'::timestamptz),
            '[)'
          ) && tstzrange(
            conflicting_reservation.planned_check_in_at,
            coalesce(conflicting_reservation.planned_check_out_at, 'infinity'::timestamptz),
            '[)'
          )
      )
    order by
      case when candidate.floor_id = current_room.floor_id then 0 else 1 end,
      candidate.room_number asc
    limit 1
    for update;

    if matching_room.id is null then
      raise exception using errcode = 'P0001', message = 'No equivalent room is available for automatic reallocation';
    end if;

    update public.reservations
    set room_id = matching_room.id,
        version = version + 1,
        updated_by = p_actor_id
    where id = conflicting_reservation.id
    returning * into moved_reservation;

    insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
    values (
      p_actor_id,
      'reservation.reallocated',
      'reservation',
      conflicting_reservation.id,
      jsonb_build_object('reservation', to_jsonb(conflicting_reservation), 'roomId', conflicting_reservation.room_id),
      jsonb_build_object('reservation', to_jsonb(moved_reservation), 'roomId', matching_room.id, 'reason', 'active_stay_extension')
    );
  end loop;

  update public.reservations
  set planned_check_out_at = p_planned_check_out_at,
      note = case when p_update_note then nullif(trim(coalesce(p_note, '')), '') else note end,
      version = version + 1,
      updated_by = p_actor_id
  where id = current_reservation.id and version = p_expected_version
  returning * into updated_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (
    p_actor_id,
    'reservation.updated',
    'reservation',
    current_reservation.id,
    to_jsonb(current_reservation),
    to_jsonb(updated_reservation)
  );

  return updated_reservation;
end;
$$;

revoke execute on function public.update_open_stay_checkout(uuid, integer, timestamptz, boolean, text, uuid) from public;
grant execute on function public.update_open_stay_checkout(uuid, integer, timestamptz, boolean, text, uuid) to authenticated;
