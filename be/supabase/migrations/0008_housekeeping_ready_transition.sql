-- A room can become ready through the operational housekeeping flow only
-- after checkout has put it into cleaning. This prevents direct API calls
-- from bypassing turnover while a guest is still staying in the room.

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

  if p_status = 'ready' and current_room.housekeeping_status <> 'cleaning' then
    raise exception using errcode = 'P0001', message = 'Room is not awaiting housekeeping completion';
  end if;

  if p_status = 'ready' and exists (
    select 1
    from public.reservations
    where room_id = p_room_id and status = 'checked_in'
  ) then
    raise exception using errcode = 'P0001', message = 'Room turnover is pending';
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
