-- Transactional operations used by the advance-reservation dashboard.
-- The functions execute with the authenticated user's request context and
-- write the immutable audit record in the same transaction as the status change.

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
  if current_reservation.status not in ('draft', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'Reservation cannot be checked in from its current status';
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

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_expected_version integer,
  p_actor_id uuid,
  p_reason text
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
  if nullif(trim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Cancellation reason is required';
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
    raise exception using errcode = 'P0001', message = 'Reservation cannot be cancelled from its current status';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancellation_reason = trim(p_reason),
      cancelled_at = now(),
      cancelled_by = p_actor_id,
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id and version = p_expected_version
  returning * into updated_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (p_actor_id, 'reservation.cancelled', 'reservation', p_reservation_id, to_jsonb(current_reservation), to_jsonb(updated_reservation));

  return updated_reservation;
end;
$$;

revoke execute on function public.check_in_reservation(uuid, integer, uuid) from public;
revoke execute on function public.cancel_reservation(uuid, integer, uuid, text) from public;
grant execute on function public.check_in_reservation(uuid, integer, uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid, integer, uuid, text) to authenticated;
