-- A physical room with a known planned checkout can be sold after that
-- estimate. If the present guest later stays longer, the future reservation is
-- deliberately blocked at check-in for a staff decision; the system never
-- silently moves either party. An open stay (NULL checkout) still blocks the
-- room indefinitely.

create or replace function public.prevent_reservation_on_occupied_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.room_id is null then
    return new;
  end if;
  if new.status in ('draft', 'confirmed') and exists (
    select 1
    from public.reservations existing_stay
    where existing_stay.room_id = new.room_id
      and existing_stay.id <> new.id
      and existing_stay.status = 'checked_in'
      and (
        existing_stay.planned_check_out_at is null
        or existing_stay.planned_check_out_at > new.planned_check_in_at
      )
  ) then
    raise exception using errcode = 'P0001', message = 'Room is occupied beyond the requested check-in time';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_reservation_on_occupied_room() from public;
