-- Reservation service editing V1: a checked-in stay may correct a manually
-- entered service while preserving the immutable charge snapshot/audit trail.

create or replace function public.update_reservation_service(
  p_service_id uuid,
  p_name text,
  p_unit_price numeric,
  p_quantity integer,
  p_note text,
  p_actor_id uuid
)
returns public.reservation_services
language plpgsql
security definer
set search_path = public
as $$
declare
  current_service public.reservation_services;
  updated_service public.reservation_services;
  current_reservation public.reservations;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception using errcode = '22023', message = 'Service name is required';
  end if;
  if p_unit_price is null or p_unit_price < 1 or p_unit_price <> trunc(p_unit_price) then
    raise exception using errcode = '22023', message = 'Service unit price must be a positive integer VND amount';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception using errcode = '22023', message = 'Service quantity must be a positive integer';
  end if;

  select * into current_service
  from public.reservation_services
  where id = p_service_id and active = true
  for update;

  if current_service.id is null then
    raise exception using errcode = 'P0002', message = 'Reservation service was not found';
  end if;

  select * into current_reservation
  from public.reservations
  where id = current_service.reservation_id
  for update;

  if current_reservation.id is null then
    raise exception using errcode = 'P0002', message = 'Reservation was not found';
  end if;
  if current_reservation.status <> 'checked_in' then
    raise exception using errcode = 'P0001', message = 'Services can only be edited for checked-in reservations';
  end if;

  update public.reservation_services
  set name_snapshot = trim(p_name),
      unit_price_snapshot = p_unit_price,
      quantity = p_quantity,
      total = p_unit_price * p_quantity,
      note = nullif(trim(coalesce(p_note, '')), ''),
      updated_by = p_actor_id
  where id = current_service.id
  returning * into updated_service;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (
    p_actor_id,
    'service.updated',
    'reservation_service',
    p_service_id,
    to_jsonb(current_service),
    to_jsonb(updated_service)
  );

  return updated_service;
end;
$$;

revoke execute on function public.update_reservation_service(uuid, text, numeric, integer, text, uuid) from public;
revoke execute on function public.update_reservation_service(uuid, text, numeric, integer, text, uuid) from anon, service_role;
grant execute on function public.update_reservation_service(uuid, text, numeric, integer, text, uuid) to authenticated;
