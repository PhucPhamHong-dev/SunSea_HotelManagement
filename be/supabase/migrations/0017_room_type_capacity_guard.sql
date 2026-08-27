-- Close the remaining overbooking path: an exact physical-room reservation
-- must also consume room-type inventory, because a deferred booking may have
-- already consumed the final equivalent room for that interval.

create or replace function public.prevent_room_type_overbooking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('draft', 'confirmed', 'checked_in')
    and (new.status <> 'draft' or new.hold_expires_at is null or new.hold_expires_at > now())
    and public.room_type_committed_count(new.room_type_id, new.planned_check_in_at, new.planned_check_out_at, new.id)
      >= public.room_type_active_inventory(new.room_type_id) then
    raise exception using errcode = 'P0001', message = 'No matching room type inventory is available for the selected period';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_prevent_room_type_overbooking on public.reservations;
create trigger reservations_prevent_room_type_overbooking
before insert or update of room_type_id, planned_check_in_at, planned_check_out_at, status, hold_expires_at
on public.reservations
for each row execute function public.prevent_room_type_overbooking();

revoke execute on function public.prevent_room_type_overbooking() from public;
