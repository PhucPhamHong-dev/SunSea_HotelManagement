-- Correct the physical inventory used by equivalent-room matching and add the
-- fourth-floor inventory. A room type is the exact pair (bed_count, has_window).
-- Never silently downgrade an active reservation that explicitly names room 301.

do $$
declare
  actor_id uuid;
  floor_four_id uuid;
  room_301_id uuid;
  old_three_bed_no_window_type_id uuid;
  old_two_bed_no_window_type_id uuid;
  three_bed_window_type_id uuid;
  two_bed_window_type_id uuid;
  projected_three_bed_window_commitments integer;
  projected_two_bed_window_commitments integer;
  three_bed_window_inventory integer;
  two_bed_window_inventory integer;
begin
  select id into actor_id
  from public.profiles
  where active = true
  order by case when role = 'owner' then 0 else 1 end, created_at
  limit 1;

  select id into room_301_id
  from public.rooms
  where room_number = '301'
  for update;

  if room_301_id is null then
    raise exception using errcode = 'P0002', message = 'Room 301 must exist before applying the room attribute correction';
  end if;

  -- 301 changes from three beds to two beds. An active guest or a future
  -- booking that explicitly chose it must be handled by staff first, rather
  -- than being silently downgraded by a data migration.
  if exists (
    select 1
    from public.reservations reservation
    where reservation.status in ('draft', 'confirmed', 'checked_in')
      and (reservation.status <> 'draft' or reservation.hold_expires_at is null or reservation.hold_expires_at > now())
      and (reservation.room_id = room_301_id or reservation.preferred_room_id = room_301_id)
  ) then
    raise exception using errcode = 'P0001', message = 'Room 301 has an active reservation. Reassign or close it before changing 301 from three beds to two beds.';
  end if;

  select id into old_three_bed_no_window_type_id
  from public.room_types
  where bed_count = 3 and has_window = false;

  select id into old_two_bed_no_window_type_id
  from public.room_types
  where bed_count = 2 and has_window = false;

  insert into public.floors (floor_number, name, active, created_by, updated_by)
  values (4, 'Tầng 4', true, actor_id, actor_id)
  on conflict (floor_number) do update
    set name = excluded.name,
        active = true,
        updated_at = now(),
        updated_by = excluded.updated_by
  returning id into floor_four_id;

  -- The existing trigger assigns the matching room_type_id whenever bed/window
  -- attributes change. This is the source of truth for future availability.
  update public.rooms
  set bed_count = case when room_number = '301' then 2 else bed_count end,
      has_window = room_number = any (array['101', '102', '105', '201', '202', '205', '301', '302', '305']),
      updated_at = now(),
      updated_by = actor_id
  where room_number = any (array['101', '102', '103', '104', '105', '201', '202', '203', '204', '205', '301', '302', '303', '304', '305']);

  insert into public.rooms (floor_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, active, housekeeping_status, created_by, updated_by)
  values
    (floor_four_id, '4A', 1, false, null, 'fourth-floor-a', true, 'ready', actor_id, actor_id),
    (floor_four_id, '4B', 2, true, null, 'fourth-floor-b', true, 'ready', actor_id, actor_id)
  on conflict (room_number) do update
    set floor_id = excluded.floor_id,
        bed_count = excluded.bed_count,
        has_window = excluded.has_window,
        layout_key = excluded.layout_key,
        active = true,
        updated_at = now(),
        updated_by = excluded.updated_by;

  select id into three_bed_window_type_id
  from public.room_types
  where bed_count = 3 and has_window = true;

  select id into two_bed_window_type_id
  from public.room_types
  where bed_count = 2 and has_window = true;

  if three_bed_window_type_id is null or two_bed_window_type_id is null then
    raise exception using errcode = 'P0001', message = 'Room type synchronization failed while correcting room attributes';
  end if;

  -- Reservations for 101/201 and 105/205/305 preserve their bed count; the
  -- only change is the newly confirmed window attribute. Deferred bookings of
  -- those old types receive the corresponding upgraded type as well.
  select count(*)::integer into projected_three_bed_window_commitments
  from public.reservations reservation
  where reservation.status in ('draft', 'confirmed', 'checked_in')
    and (reservation.status <> 'draft' or reservation.hold_expires_at is null or reservation.hold_expires_at > now())
    and reservation.room_type_id in (old_three_bed_no_window_type_id, three_bed_window_type_id);

  select count(*)::integer into projected_two_bed_window_commitments
  from public.reservations reservation
  where reservation.status in ('draft', 'confirmed', 'checked_in')
    and (reservation.status <> 'draft' or reservation.hold_expires_at is null or reservation.hold_expires_at > now())
    and reservation.room_type_id in (old_two_bed_no_window_type_id, two_bed_window_type_id);

  select count(*)::integer into three_bed_window_inventory
  from public.rooms
  where active = true and bed_count = 3 and has_window = true;

  select count(*)::integer into two_bed_window_inventory
  from public.rooms
  where active = true and bed_count = 2 and has_window = true;

  if projected_three_bed_window_commitments > three_bed_window_inventory then
    raise exception using errcode = 'P0001', message = 'Active three-bed reservations exceed the corrected three-bed window inventory';
  end if;

  if projected_two_bed_window_commitments > two_bed_window_inventory then
    raise exception using errcode = 'P0001', message = 'Active two-bed reservations exceed the corrected two-bed window inventory';
  end if;

  update public.reservations
  set room_type_id = three_bed_window_type_id,
      updated_at = now(),
      updated_by = actor_id
  where status in ('draft', 'confirmed', 'checked_in')
    and (status <> 'draft' or hold_expires_at is null or hold_expires_at > now())
    and room_type_id = old_three_bed_no_window_type_id;

  update public.reservations
  set room_type_id = two_bed_window_type_id,
      updated_at = now(),
      updated_by = actor_id
  where status in ('draft', 'confirmed', 'checked_in')
    and (status <> 'draft' or hold_expires_at is null or hold_expires_at > now())
    and room_type_id = old_two_bed_no_window_type_id;
end;
$$;
