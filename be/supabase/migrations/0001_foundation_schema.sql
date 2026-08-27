create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.profile_role as enum ('receptionist', 'manager', 'owner');
create type public.housekeeping_status as enum ('ready', 'cleaning', 'out_of_service');
create type public.reservation_status as enum ('draft', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
create type public.pricing_policy_status as enum ('draft', 'active', 'archived');
create type public.payment_type as enum ('deposit', 'settlement', 'refund', 'adjustment');
create type public.payment_method as enum ('cash', 'bank_transfer', 'other');
create type public.payment_status as enum ('pending', 'completed', 'voided', 'refunded');
create type public.charge_type as enum ('room_night', 'short_stay_base', 'short_stay_extra', 'late_checkout', 'service', 'discount', 'manual_adjustment');
create type public.charge_status as enum ('active', 'voided');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.profile_role not null default 'receptionist',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  floor_number integer not null unique check (floor_number > 0),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id),
  room_number text not null unique,
  bed_count integer not null check (bed_count > 0),
  default_nightly_rate numeric(12, 2) check (default_nightly_rate is null or default_nightly_rate >= 0),
  layout_key text not null default 'standard',
  housekeeping_status public.housekeeping_status not null default 'ready',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  id_number text,
  date_of_birth date,
  id_issued_date date,
  address text,
  note text,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.pricing_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null check (version > 0),
  status public.pricing_policy_status not null default 'draft',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (name, version)
);

create unique index pricing_policies_one_active_idx on public.pricing_policies (status) where status = 'active';

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_policy_id uuid not null references public.pricing_policies(id),
  name text not null,
  rule_category text not null,
  condition_type text not null,
  calculation_type text not null check (calculation_type in ('fixed_amount', 'percentage_of_room_rate', 'fixed_per_hour', 'base_block_plus_extra_unit', 'nightly_rate')),
  parameters jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  guest_id uuid not null references public.guests(id),
  planned_check_in_at timestamptz not null,
  planned_check_out_at timestamptz not null,
  actual_check_in_at timestamptz,
  actual_check_out_at timestamptz,
  status public.reservation_status not null default 'draft',
  room_rate_snapshot numeric(12, 2) check (room_rate_snapshot is null or room_rate_snapshot >= 0),
  deposit_expected numeric(12, 2) not null default 0 check (deposit_expected >= 0),
  note text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  no_show_at timestamptz,
  no_show_by uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (planned_check_out_at > planned_check_in_at),
  check (status <> 'cancelled' or nullif(trim(cancellation_reason), '') is not null),
  check (status <> 'no_show' or no_show_at is not null)
);

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(planned_check_in_at, planned_check_out_at, '[)') with &&
  ) where (status in ('confirmed', 'checked_in'));

create table public.reservation_pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  room_rate_snapshot numeric(12, 2) check (room_rate_snapshot is null or room_rate_snapshot >= 0),
  policy_id uuid references public.pricing_policies(id),
  policy_version integer,
  resolved_billing_mode text not null,
  calculation_input jsonb not null default '{}'::jsonb,
  calculation_result jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.reservation_charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  charge_type public.charge_type not null,
  description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  source_rule_id uuid references public.pricing_rules(id),
  metadata jsonb not null default '{}'::jsonb,
  status public.charge_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_price numeric(12, 2) not null check (default_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.reservation_services (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  service_id uuid references public.service_catalog(id),
  name_snapshot text not null,
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  quantity numeric(12, 3) not null check (quantity > 0),
  total numeric(12, 2) not null check (total >= 0),
  note text,
  active boolean not null default true,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  payment_type public.payment_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  note text,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.hotel_settings (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  standard_check_in_time time not null default '14:00',
  standard_check_out_time time not null default '12:00',
  late_checkout_surcharge_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index rooms_floor_id_idx on public.rooms (floor_id);
create index reservations_room_status_idx on public.reservations (room_id, status);
create index reservations_guest_id_idx on public.reservations (guest_id);
create index reservations_planned_dates_idx on public.reservations (planned_check_in_at, planned_check_out_at);
create index guests_search_idx on public.guests (phone, id_number, full_name);
create index reservation_services_reservation_idx on public.reservation_services (reservation_id);
create index payments_reservation_idx on public.payments (reservation_id, status);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard delete is disabled for immutable business history';
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['guests', 'reservations', 'payments', 'pricing_policies', 'audit_logs'] loop
    execute format('create trigger %I_no_hard_delete before delete on public.%I for each row execute function public.prevent_hard_delete()', table_name, table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'floors', 'rooms', 'guests', 'pricing_policies', 'pricing_rules',
    'reservations', 'reservation_pricing_snapshots', 'reservation_charges',
    'service_catalog', 'reservation_services', 'payments', 'hotel_settings'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, active)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'receptionist', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
