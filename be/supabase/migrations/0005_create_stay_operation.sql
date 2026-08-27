-- Atomic intake operation for the empty-room panel.
-- The function creates the guest and reservation together so a reservation
-- conflict never leaves an orphan guest record behind.

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
  p_deposit_expected numeric default 0,
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
  if p_deposit_expected < 0 then
    raise exception using errcode = '22023', message = 'Expected deposit cannot be negative';
  end if;
  if p_mode not in ('check_in', 'advance') then
    raise exception using errcode = '22023', message = 'Unsupported intake action';
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
    full_name,
    phone,
    id_number,
    date_of_birth,
    id_issued_date,
    address,
    created_by,
    updated_by
  ) values (
    trim(p_guest_full_name),
    nullif(trim(p_guest_phone), ''),
    nullif(trim(p_guest_id_number), ''),
    p_guest_date_of_birth,
    p_guest_id_issued_date,
    nullif(trim(p_guest_address), ''),
    p_actor_id,
    p_actor_id
  ) returning * into guest_record;

  insert into public.reservations (
    room_id,
    guest_id,
    planned_check_in_at,
    planned_check_out_at,
    actual_check_in_at,
    status,
    room_rate_snapshot,
    deposit_expected,
    note,
    created_by,
    updated_by
  ) values (
    p_room_id,
    guest_record.id,
    p_planned_check_in_at,
    p_planned_check_out_at,
    case when p_mode = 'check_in' then now() else null end,
    case when p_mode = 'check_in' then 'checked_in'::public.reservation_status else 'confirmed'::public.reservation_status end,
    room_record.default_nightly_rate,
    coalesce(p_deposit_expected, 0),
    nullif(trim(p_note), ''),
    p_actor_id,
    p_actor_id
  ) returning * into reservation_record;

  insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
  values (
    p_actor_id,
    case when p_mode = 'check_in' then 'reservation.checked_in' else 'reservation.created' end,
    'reservation',
    reservation_record.id,
    jsonb_build_object('reservation', to_jsonb(reservation_record), 'guest', to_jsonb(guest_record))
  );

  return jsonb_build_object(
    'action', p_mode,
    'reservation', to_jsonb(reservation_record),
    'guest', to_jsonb(guest_record)
  );
end;
$$;

revoke execute on function public.create_stay(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, numeric, text, uuid) from public;
grant execute on function public.create_stay(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, numeric, text, uuid) to authenticated;
