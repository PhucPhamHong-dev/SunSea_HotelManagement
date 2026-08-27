-- Sell inventory by room type while retaining the physical room assignment.
-- A room type is an exact combination of bed count and window availability.
-- Physical rooms are assigned immediately for walk-ins, or at check-in for
-- advance reservations that were accepted against room-type inventory.

create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  bed_count integer not null check (bed_count > 0),
  has_window boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (bed_count, has_window)
);

insert into public.room_types (code, name, bed_count, has_window)
select
  format('B%s-W%s', bed_count, case when has_window then 1 else 0 end),
  format('%s giường%s', bed_count, case when has_window then ' · Có cửa sổ' else ' · Không cửa sổ' end),
  bed_count,
  has_window
from public.rooms
group by bed_count, has_window
on conflict (bed_count, has_window) do nothing;

alter table public.rooms add column if not exists room_type_id uuid references public.room_types(id);
update public.rooms room
set room_type_id = room_type.id
from public.room_types room_type
where room_type.bed_count = room.bed_count
  and room_type.has_window = room.has_window
  and room.room_type_id is null;
alter table public.rooms alter column room_type_id set not null;
create index if not exists rooms_room_type_id_idx on public.rooms (room_type_id) where active = true;

create or replace function public.assign_room_type_from_attributes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_type_id uuid;
begin
  select id into resolved_type_id
  from public.room_types
  where bed_count = new.bed_count and has_window = new.has_window;
  if resolved_type_id is null then
    insert into public.room_types (code, name, bed_count, has_window, created_by, updated_by)
    values (
      format('B%s-W%s', new.bed_count, case when new.has_window then 1 else 0 end),
      format('%s giường%s', new.bed_count, case when new.has_window then ' · Có cửa sổ' else ' · Không cửa sổ' end),
      new.bed_count, new.has_window, new.created_by, new.updated_by
    ) returning id into resolved_type_id;
  end if;
  new.room_type_id = resolved_type_id;
  return new;
end;
$$;

drop trigger if exists rooms_assign_room_type_from_attributes on public.rooms;
create trigger rooms_assign_room_type_from_attributes
before insert or update of bed_count, has_window on public.rooms
for each row execute function public.assign_room_type_from_attributes();

alter table public.reservations add column if not exists room_type_id uuid references public.room_types(id);
alter table public.reservations add column if not exists preferred_room_id uuid references public.rooms(id);
alter table public.reservations add column if not exists hold_expires_at timestamptz;

update public.reservations reservation
set room_type_id = room.room_type_id,
    preferred_room_id = coalesce(reservation.preferred_room_id, reservation.room_id)
from public.rooms room
where room.id = reservation.room_id
  and reservation.room_type_id is null;
alter table public.reservations alter column room_type_id set not null;
alter table public.reservations alter column room_id drop not null;

-- Old data remains a durable, explicitly assigned reservation. New draft
-- holds expire after 30 minutes; confirmed and checked-in reservations do not.
update public.reservations
set hold_expires_at = created_at + interval '30 minutes'
where status = 'draft' and hold_expires_at is null;

create or replace function public.set_draft_hold_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'draft' and new.hold_expires_at is null then
    new.hold_expires_at = now() + interval '30 minutes';
  elsif new.status <> 'draft' then
    new.hold_expires_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_set_draft_hold_expiry on public.reservations;
create trigger reservations_set_draft_hold_expiry
before insert or update of status, hold_expires_at on public.reservations
for each row execute function public.set_draft_hold_expiry();

alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations add constraint reservations_no_overlap
exclude using gist (
  room_id with =,
  tstzrange(planned_check_in_at, coalesce(planned_check_out_at, 'infinity'::timestamptz), '[)') with &&
) where (room_id is not null and status in ('draft', 'confirmed', 'checked_in'));

create index if not exists reservations_room_type_interval_idx
  on public.reservations (room_type_id, planned_check_in_at, planned_check_out_at)
  where status in ('draft', 'confirmed', 'checked_in');
create index if not exists reservations_preferred_room_id_idx
  on public.reservations (preferred_room_id) where preferred_room_id is not null;
create index if not exists reservations_draft_hold_expiry_idx
  on public.reservations (hold_expires_at) where status = 'draft';

alter table public.room_types enable row level security;
drop policy if exists room_types_active_user on public.room_types;
create policy room_types_active_user on public.room_types
for all using (public.is_active_user()) with check (public.is_active_user());

drop trigger if exists room_types_updated_at on public.room_types;
create trigger room_types_updated_at
before update on public.room_types
for each row execute function public.set_updated_at();

-- Counts reservations against a room type. An estimated checkout is used as
-- the planning horizon for a checked-in stay. A NULL checkout is deliberately
-- infinite: an open stay cannot be sold again until its staff sets an estimate
-- or checks it out.
create or replace function public.room_type_committed_count(
  p_room_type_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_reservation_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.reservations reservation
  where reservation.room_type_id = p_room_type_id
    and reservation.status in ('draft', 'confirmed', 'checked_in')
    and (reservation.status <> 'draft' or reservation.hold_expires_at is null or reservation.hold_expires_at > now())
    and (p_exclude_reservation_id is null or reservation.id <> p_exclude_reservation_id)
    and tstzrange(
      reservation.planned_check_in_at,
      coalesce(reservation.planned_check_out_at, 'infinity'::timestamptz),
      '[)'
    ) && tstzrange(p_start, coalesce(p_end, 'infinity'::timestamptz), '[)');
$$;

create or replace function public.room_type_active_inventory(p_room_type_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.rooms
  where room_type_id = p_room_type_id
    and active = true
    and housekeeping_status <> 'out_of_service';
$$;

-- This is intentionally separate from availability for a future date: a room
-- being cleaned now blocks immediate check-in only, not a booking tomorrow.
create or replace function public.room_type_has_ready_assignment(p_room_type_id uuid, p_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms candidate
    where candidate.room_type_id = p_room_type_id
      and candidate.active = true
      and candidate.housekeeping_status = 'ready'
      and not exists (
        select 1
        from public.reservations occupied
        where occupied.room_id = candidate.id
          and occupied.id <> p_reservation_id
          and occupied.status in ('draft', 'confirmed', 'checked_in')
          and (occupied.status <> 'draft' or occupied.hold_expires_at is null or occupied.hold_expires_at > now())
          and tstzrange(
            occupied.planned_check_in_at,
            coalesce(occupied.planned_check_out_at, 'infinity'::timestamptz),
            '[)'
          ) @> now()
      )
  );
$$;

-- New intake function. `exact` reserves the requested physical room; room
-- type mode reserves only matching inventory and keeps the requested room as
-- a preference. Deferred assignment is never allowed for an immediate stay.
create or replace function public.create_stay_by_room_type(
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
  p_assignment_mode text,
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
  requested_room public.rooms;
  room_type_record public.room_types;
  guest_record public.guests;
  reservation_record public.reservations;
  deposit_payment_record public.payments;
  local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  local_hour integer := extract(hour from (now() at time zone 'Asia/Ho_Chi_Minh'))::integer;
  check_in_date date := (p_planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  should_assign_exact boolean;
  requested_room_conflict boolean;
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
  if p_assignment_mode not in ('exact', 'room_type') then
    raise exception using errcode = '22023', message = 'Unsupported room assignment mode';
  end if;
  if p_mode = 'check_in' and p_assignment_mode <> 'exact' then
    raise exception using errcode = '22023', message = 'Immediate check-in requires an exact ready room';
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

  select * into requested_room from public.rooms where id = p_room_id and active = true for update;
  if requested_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;
  if requested_room.housekeeping_status = 'out_of_service' then
    raise exception using errcode = 'P0001', message = 'Room is out of service';
  end if;
  select * into room_type_record from public.room_types where id = requested_room.room_type_id and active = true for update;
  if room_type_record.id is null then
    raise exception using errcode = 'P0002', message = 'Room type was not found';
  end if;

  should_assign_exact := p_assignment_mode = 'exact';
  requested_room_conflict := exists (
    select 1 from public.reservations existing_reservation
    where existing_reservation.room_id = requested_room.id
      and existing_reservation.status in ('draft', 'confirmed', 'checked_in')
      and (existing_reservation.status <> 'draft' or existing_reservation.hold_expires_at is null or existing_reservation.hold_expires_at > now())
      and tstzrange(existing_reservation.planned_check_in_at, coalesce(existing_reservation.planned_check_out_at, 'infinity'::timestamptz), '[)')
        && tstzrange(p_planned_check_in_at, coalesce(p_planned_check_out_at, 'infinity'::timestamptz), '[)')
  );

  if p_mode = 'check_in' and requested_room.housekeeping_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'Room is not ready for intake';
  end if;
  if should_assign_exact and requested_room_conflict then
    raise exception using errcode = '23P01', message = 'Room is already reserved for the selected period';
  end if;
  if p_assignment_mode = 'room_type' and public.room_type_committed_count(room_type_record.id, p_planned_check_in_at, p_planned_check_out_at, null)
      >= public.room_type_active_inventory(room_type_record.id) then
    raise exception using errcode = 'P0001', message = 'No matching room type inventory is available for the selected period';
  end if;

  insert into public.guests (full_name, phone, id_number, date_of_birth, id_issued_date, address, created_by, updated_by)
  values (
    trim(p_guest_full_name), nullif(trim(p_guest_phone), ''), nullif(trim(p_guest_id_number), ''),
    p_guest_date_of_birth, p_guest_id_issued_date, nullif(trim(p_guest_address), ''), p_actor_id, p_actor_id
  ) returning * into guest_record;

  insert into public.reservations (
    room_id, preferred_room_id, room_type_id, guest_id, planned_check_in_at, planned_check_out_at, actual_check_in_at,
    status, room_rate_snapshot, deposit_expected, note, created_by, updated_by
  ) values (
    case when should_assign_exact then requested_room.id else null end,
    requested_room.id, room_type_record.id, guest_record.id, p_planned_check_in_at, p_planned_check_out_at,
    case when p_mode = 'check_in' then now() else null end,
    case when p_mode = 'check_in' then 'checked_in'::public.reservation_status else 'confirmed'::public.reservation_status end,
    p_room_rate_per_night, 0, nullif(trim(p_note), ''), p_actor_id, p_actor_id
  ) returning * into reservation_record;

  insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
  values (
    p_actor_id,
    case when p_mode = 'check_in' then 'reservation.checked_in' else 'reservation.created' end,
    'reservation', reservation_record.id,
    jsonb_build_object('reservation', to_jsonb(reservation_record), 'guest', to_jsonb(guest_record), 'assignmentMode', p_assignment_mode)
  );

  if p_mode = 'advance' and coalesce(p_deposit_amount, 0) > 0 then
    insert into public.payments (reservation_id, payment_type, amount, method, status, paid_at, note, created_by, updated_by)
    values (
      reservation_record.id, 'deposit'::public.payment_type, p_deposit_amount,
      'other'::public.payment_method, 'completed'::public.payment_status, now(),
      'Tiền cọc ghi nhận khi tạo đặt phòng', p_actor_id, p_actor_id
    ) returning * into deposit_payment_record;
    insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
    values (p_actor_id, 'payment.created', 'payment', deposit_payment_record.id,
      jsonb_build_object('payment', to_jsonb(deposit_payment_record), 'reservationId', reservation_record.id));
  end if;

  return jsonb_build_object('action', p_mode, 'reservation', to_jsonb(reservation_record), 'guest', to_jsonb(guest_record));
end;
$$;

-- A deferred reservation receives an actual room only at check-in. Preference
-- is honored first; otherwise the first ready matching room is assigned.
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
  assigned_room public.rooms;
  updated_reservation public.reservations;
  local_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;
  select * into current_reservation from public.reservations where id = p_reservation_id for update;
  if current_reservation.id is null then raise exception using errcode = 'P0002', message = 'Reservation was not found'; end if;
  if current_reservation.version <> p_expected_version then raise exception using errcode = '40001', message = 'Reservation was changed by another user'; end if;
  if current_reservation.status not in ('draft', 'confirmed') then raise exception using errcode = 'P0001', message = 'Reservation cannot be checked in from its current status'; end if;
  if (current_reservation.planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date > local_today then
    raise exception using errcode = 'P0001', message = 'Check-in is before the planned check-in date';
  end if;

  select candidate.* into assigned_room
  from public.rooms candidate
  where candidate.active = true
    and candidate.room_type_id = current_reservation.room_type_id
    and candidate.housekeeping_status = 'ready'
    and (current_reservation.room_id is null or candidate.id = current_reservation.room_id)
    and not exists (
      select 1 from public.reservations conflict
      where conflict.room_id = candidate.id
        and conflict.id <> current_reservation.id
        and conflict.status in ('draft', 'confirmed', 'checked_in')
        and (conflict.status <> 'draft' or conflict.hold_expires_at is null or conflict.hold_expires_at > now())
        and tstzrange(conflict.planned_check_in_at, coalesce(conflict.planned_check_out_at, 'infinity'::timestamptz), '[)') @> now()
    )
  order by case when candidate.id = current_reservation.preferred_room_id then 0 else 1 end, candidate.room_number
  limit 1
  for update;
  if assigned_room.id is null then
    raise exception using errcode = 'P0001', message = 'No ready matching room is available for check-in';
  end if;

  update public.reservations
  set room_id = assigned_room.id,
      status = 'checked_in',
      actual_check_in_at = now(),
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id and version = p_expected_version
  returning * into updated_reservation;
  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (p_actor_id, 'reservation.checked_in', 'reservation', p_reservation_id,
    to_jsonb(current_reservation), jsonb_build_object('reservation', to_jsonb(updated_reservation), 'assignedRoom', to_jsonb(assigned_room)));
  return updated_reservation;
end;
$$;

-- A guest extension never silently moves another guest or booking. Staff must
-- decide the alternative action explicitly in a future assignment workflow.
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
  updated_reservation public.reservations;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;
  select * into current_reservation from public.reservations where id = p_reservation_id for update;
  if current_reservation.id is null then raise exception using errcode = 'P0002', message = 'Reservation was not found'; end if;
  if current_reservation.version <> p_expected_version then raise exception using errcode = '40001', message = 'Reservation was changed by another user'; end if;
  if current_reservation.status <> 'checked_in' then raise exception using errcode = 'P0001', message = 'Only checked-in stays can extend an open checkout'; end if;
  if p_planned_check_out_at is not null and p_planned_check_out_at <= current_reservation.planned_check_in_at then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if public.room_type_committed_count(current_reservation.room_type_id, current_reservation.planned_check_in_at, p_planned_check_out_at, current_reservation.id)
      >= public.room_type_active_inventory(current_reservation.room_type_id) then
    raise exception using errcode = 'P0001', message = 'Room type availability conflict requires staff decision';
  end if;
  update public.reservations
  set planned_check_out_at = p_planned_check_out_at,
      note = case when p_update_note then nullif(trim(coalesce(p_note, '')), '') else note end,
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id and version = p_expected_version
  returning * into updated_reservation;
  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (p_actor_id, 'reservation.updated', 'reservation', current_reservation.id, to_jsonb(current_reservation), to_jsonb(updated_reservation));
  return updated_reservation;
end;
$$;

create or replace function public.release_expired_draft_reservations()
returns table (reservation_id uuid, room_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reservation public.reservations;
  updated_reservation public.reservations;
begin
  for current_reservation in
    select * from public.reservations
    where status = 'draft' and hold_expires_at is not null and hold_expires_at <= now()
    for update skip locked
  loop
    update public.reservations
    set status = 'cancelled', cancellation_reason = 'Giữ phòng tạm đã hết hạn', cancelled_at = now(),
        cancelled_by = null, version = version + 1, updated_by = null
    where id = current_reservation.id and status = 'draft'
    returning * into updated_reservation;
    if updated_reservation.id is null then continue; end if;
    insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
    values (null, 'reservation.hold_expired', 'reservation', updated_reservation.id, to_jsonb(current_reservation), to_jsonb(updated_reservation));
    return query select updated_reservation.id, updated_reservation.room_id;
  end loop;
end;
$$;

revoke all on function public.create_stay_by_room_type(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, text, numeric, numeric, text, uuid) from public, anon, service_role;
grant execute on function public.create_stay_by_room_type(uuid, text, text, text, date, date, text, timestamptz, timestamptz, text, text, numeric, numeric, text, uuid) to authenticated;
revoke all on function public.release_expired_draft_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_draft_reservations() to service_role;
revoke execute on function public.room_type_committed_count(uuid, timestamptz, timestamptz, uuid) from public;
revoke execute on function public.room_type_active_inventory(uuid) from public;
revoke execute on function public.room_type_has_ready_assignment(uuid, uuid) from public;
