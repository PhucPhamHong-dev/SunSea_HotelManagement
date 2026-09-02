-- A checked-in room can host more than one person. Keep the historical
-- reservations.guest_id as the primary guest for compatibility, and store
-- every actual occupant in reservation_guests with their document metadata.
-- This migration intentionally does not deduplicate document numbers: lookup
-- and duplicate detection are a later operational workflow.

do $$
begin
  create type public.guest_document_type as enum ('national_id', 'passport');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reservation_guest_role as enum ('primary', 'companion');
exception when duplicate_object then null;
end $$;

create table if not exists public.guest_documents (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id),
  document_type public.guest_document_type not null,
  document_number text not null check (nullif(trim(document_number), '') is not null),
  nationality text not null,
  document_issued_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (
    (document_type = 'national_id' and nationality = 'VN' and document_issued_at is not null)
    or (document_type = 'passport' and nullif(trim(nationality), '') is not null)
  )
);

create index if not exists guest_documents_guest_id_idx on public.guest_documents(guest_id);
create index if not exists guest_documents_lookup_idx on public.guest_documents(document_type, document_number);

create table if not exists public.reservation_guests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  guest_id uuid not null references public.guests(id),
  guest_document_id uuid not null references public.guest_documents(id),
  role public.reservation_guest_role not null,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);

create unique index if not exists reservation_guests_one_primary_idx
  on public.reservation_guests(reservation_id)
  where role = 'primary';
create index if not exists reservation_guests_reservation_id_idx on public.reservation_guests(reservation_id);

drop trigger if exists guest_documents_updated_at on public.guest_documents;
create trigger guest_documents_updated_at
before update on public.guest_documents
for each row execute function public.set_updated_at();

drop trigger if exists reservation_guests_updated_at on public.reservation_guests;
create trigger reservation_guests_updated_at
before update on public.reservation_guests
for each row execute function public.set_updated_at();

alter table public.guest_documents enable row level security;
alter table public.reservation_guests enable row level security;

drop policy if exists guest_documents_active_user on public.guest_documents;
create policy guest_documents_active_user on public.guest_documents
for all using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists reservation_guests_active_user on public.reservation_guests;
create policy reservation_guests_active_user on public.reservation_guests
for all using (public.is_active_user()) with check (public.is_active_user());

create or replace function public.check_in_room_with_guests(
  p_room_id uuid,
  p_guests jsonb,
  p_planned_check_out_at timestamptz,
  p_room_rate_per_night numeric,
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
  reservation_record public.reservations;
  created_guest public.guests;
  created_document public.guest_documents;
  guest_item jsonb;
  guest_ids uuid[] := array[]::uuid[];
  document_ids uuid[] := array[]::uuid[];
  guest_payloads jsonb := '[]'::jsonb;
  guest_index integer := 0;
  document_type public.guest_document_type;
  document_number text;
  full_name text;
  date_of_birth date;
  document_issued_at date;
  address text;
  nationality text;
  check_in_at timestamptz := now();
begin
  if auth.uid() is null or p_actor_id is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;
  if jsonb_typeof(p_guests) <> 'array' or jsonb_array_length(p_guests) = 0 then
    raise exception using errcode = '22023', message = 'At least one guest is required';
  end if;
  if p_planned_check_out_at is not null and p_planned_check_out_at <= check_in_at then
    raise exception using errcode = '22023', message = 'Check-out must be after check-in';
  end if;
  if p_room_rate_per_night is null or p_room_rate_per_night <= 0 or p_room_rate_per_night <> trunc(p_room_rate_per_night) then
    raise exception using errcode = '22023', message = 'Nightly room rate must be a positive integer amount';
  end if;

  select * into requested_room
  from public.rooms
  where id = p_room_id and active = true
  for update;
  if requested_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;
  if requested_room.housekeeping_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'Room is not ready for check-in';
  end if;
  if exists (
    select 1
    from public.reservations existing_reservation
    where existing_reservation.room_id = requested_room.id
      and existing_reservation.status in ('draft', 'confirmed', 'checked_in')
      and (existing_reservation.status <> 'draft' or existing_reservation.hold_expires_at is null or existing_reservation.hold_expires_at > now())
      and tstzrange(
        existing_reservation.planned_check_in_at,
        coalesce(existing_reservation.planned_check_out_at, 'infinity'::timestamptz),
        '[)'
      ) @> check_in_at
  ) then
    raise exception using errcode = '23P01', message = 'Room is already occupied or reserved';
  end if;

  select * into room_type_record
  from public.room_types
  where id = requested_room.room_type_id and active = true
  for update;
  if room_type_record.id is null then
    raise exception using errcode = 'P0002', message = 'Room type was not found';
  end if;

  for guest_item in select value from jsonb_array_elements(p_guests)
  loop
    guest_index := guest_index + 1;
    full_name := nullif(trim(coalesce(guest_item->>'fullName', '')), '');
    document_number := nullif(trim(coalesce(guest_item->>'documentNumber', '')), '');
    address := nullif(trim(coalesce(guest_item->>'address', '')), '');
    if full_name is null or document_number is null or address is null then
      raise exception using errcode = '22023', message = 'Guest name, document number and address are required';
    end if;
    if nullif(trim(coalesce(guest_item->>'dateOfBirth', '')), '') is null then
      raise exception using errcode = '22023', message = 'Guest date of birth is required';
    end if;
    date_of_birth := (guest_item->>'dateOfBirth')::date;

    if guest_item->>'documentType' = 'national_id' then
      document_type := 'national_id';
      if nullif(trim(coalesce(guest_item->>'documentIssuedAt', '')), '') is null then
        raise exception using errcode = '22023', message = 'National ID issue date is required';
      end if;
      document_issued_at := (guest_item->>'documentIssuedAt')::date;
      nationality := 'VN';
    elsif guest_item->>'documentType' = 'passport' then
      document_type := 'passport';
      document_issued_at := null;
      nationality := nullif(trim(coalesce(guest_item->>'nationality', '')), '');
      if nationality is null then
        raise exception using errcode = '22023', message = 'Passport nationality is required';
      end if;
    else
      raise exception using errcode = '22023', message = 'Unsupported guest document type';
    end if;

    insert into public.guests (
      full_name, phone, id_number, date_of_birth, id_issued_date, address, created_by, updated_by
    ) values (
      full_name, null, document_number, date_of_birth,
      case when document_type = 'national_id' then document_issued_at else null end,
      address, p_actor_id, p_actor_id
    ) returning * into created_guest;

    insert into public.guest_documents (
      guest_id, document_type, document_number, nationality, document_issued_at, created_by, updated_by
    ) values (
      created_guest.id, document_type, document_number, nationality, document_issued_at, p_actor_id, p_actor_id
    ) returning * into created_document;

    guest_ids := array_append(guest_ids, created_guest.id);
    document_ids := array_append(document_ids, created_document.id);
    guest_payloads := guest_payloads || jsonb_build_array(jsonb_build_object(
      'id', created_guest.id,
      'fullName', created_guest.full_name,
      'dateOfBirth', created_guest.date_of_birth,
      'address', created_guest.address,
      'document', jsonb_build_object(
        'id', created_document.id,
        'type', created_document.document_type,
        'number', created_document.document_number,
        'nationality', created_document.nationality,
        'issuedAt', created_document.document_issued_at
      ),
      'role', case when guest_index = 1 then 'primary' else 'companion' end
    ));
  end loop;

  insert into public.reservations (
    room_id, preferred_room_id, room_type_id, guest_id, planned_check_in_at, planned_check_out_at, actual_check_in_at,
    status, room_rate_snapshot, deposit_expected, note, created_by, updated_by
  ) values (
    requested_room.id, requested_room.id, room_type_record.id, guest_ids[1], check_in_at, p_planned_check_out_at, check_in_at,
    'checked_in'::public.reservation_status, p_room_rate_per_night, 0, nullif(trim(p_note), ''), p_actor_id, p_actor_id
  ) returning * into reservation_record;

  for guest_index in 1..array_length(guest_ids, 1)
  loop
    insert into public.reservation_guests (
      reservation_id, guest_id, guest_document_id, role, checked_in_at, created_by, updated_by
    ) values (
      reservation_record.id, guest_ids[guest_index], document_ids[guest_index],
      case when guest_index = 1 then 'primary'::public.reservation_guest_role else 'companion'::public.reservation_guest_role end,
      check_in_at, p_actor_id, p_actor_id
    );
  end loop;

  insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
  values (
    p_actor_id,
    'reservation.checked_in',
    'reservation',
    reservation_record.id,
    jsonb_build_object('reservation', to_jsonb(reservation_record), 'guestCount', jsonb_array_length(guest_payloads))
  );

  return jsonb_build_object(
    'reservation', to_jsonb(reservation_record),
    'guests', guest_payloads
  );
end;
$$;

revoke all on function public.check_in_room_with_guests(uuid, jsonb, timestamptz, numeric, text, uuid) from public, anon, service_role;
grant execute on function public.check_in_room_with_guests(uuid, jsonb, timestamptz, numeric, text, uuid) to authenticated;
