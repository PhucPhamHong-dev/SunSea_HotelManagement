create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.floors enable row level security;
alter table public.rooms enable row level security;
alter table public.guests enable row level security;
alter table public.pricing_policies enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_pricing_snapshots enable row level security;
alter table public.reservation_charges enable row level security;
alter table public.service_catalog enable row level security;
alter table public.reservation_services enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.hotel_settings enable row level security;

create policy profiles_active_user on public.profiles for all using (public.is_active_user()) with check (public.is_active_user());
create policy floors_active_user on public.floors for all using (public.is_active_user()) with check (public.is_active_user());
create policy rooms_active_user on public.rooms for all using (public.is_active_user()) with check (public.is_active_user());
create policy guests_active_user on public.guests for all using (public.is_active_user()) with check (public.is_active_user());
create policy pricing_policies_active_user on public.pricing_policies for all using (public.is_active_user()) with check (public.is_active_user());
create policy pricing_rules_active_user on public.pricing_rules for all using (public.is_active_user()) with check (public.is_active_user());
create policy reservations_active_user on public.reservations for all using (public.is_active_user()) with check (public.is_active_user());
create policy reservation_pricing_snapshots_active_user on public.reservation_pricing_snapshots for all using (public.is_active_user()) with check (public.is_active_user());
create policy reservation_charges_active_user on public.reservation_charges for all using (public.is_active_user()) with check (public.is_active_user());
create policy service_catalog_active_user on public.service_catalog for all using (public.is_active_user()) with check (public.is_active_user());
create policy reservation_services_active_user on public.reservation_services for all using (public.is_active_user()) with check (public.is_active_user());
create policy payments_active_user on public.payments for all using (public.is_active_user()) with check (public.is_active_user());
create policy audit_logs_read_active_user on public.audit_logs for select using (public.is_active_user());
create policy hotel_settings_active_user on public.hotel_settings for all using (public.is_active_user()) with check (public.is_active_user());

alter table public.rooms replica identity full;
alter table public.reservations replica identity full;
alter table public.reservation_services replica identity full;
alter table public.payments replica identity full;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.reservation_services;
alter publication supabase_realtime add table public.payments;
