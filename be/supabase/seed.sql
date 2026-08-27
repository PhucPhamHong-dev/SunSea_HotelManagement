-- Authentication-only seed.
-- Operational data is intentionally empty so the user can create and test it
-- through the Backend API. The only seeded record is the owner login.

do $$
declare
  admin_user_id uuid;
  floor_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where lower(email) = 'admin@sunsea.local'
  limit 1;

  if admin_user_id is null then
    admin_user_id := '00000000-0000-0000-0000-000000000001';
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@sunsea.local',
      crypt('123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"SUNSEA Admin"}'::jsonb,
      now(),
      now()
    )
    on conflict (id) do nothing;
  else
    update auth.users
    set encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = '{"username":"admin","full_name":"SUNSEA Admin"}'::jsonb,
        updated_at = now()
    where id = admin_user_id;
  end if;

  insert into public.profiles (id, username, full_name, role, active, created_by, updated_by)
  values (admin_user_id, 'admin', 'SUNSEA Admin', 'owner', true, admin_user_id, admin_user_id)
  on conflict (id) do update
    set username = excluded.username,
        full_name = excluded.full_name,
        role = excluded.role,
        active = true,
        updated_at = now(),
        updated_by = admin_user_id;

  -- Hotel master data: keep the floor map inventory, but do not seed
  -- guests, reservations, services, payments or other operational records.
  insert into public.floors (id, floor_number, name, created_by, updated_by)
  values
    ('10000000-0000-4000-8000-000000000001', 1, 'Tầng 1', admin_user_id, admin_user_id),
    ('10000000-0000-4000-8000-000000000002', 2, 'Tầng 2', admin_user_id, admin_user_id),
    ('10000000-0000-4000-8000-000000000003', 3, 'Tầng 3', admin_user_id, admin_user_id)
  on conflict (floor_number) do update
    set name = excluded.name,
        active = true,
        updated_at = now(),
        updated_by = admin_user_id;

  foreach floor_id in array array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  ] loop
    insert into public.rooms (floor_id, room_number, bed_count, has_window, default_nightly_rate, layout_key, created_by, updated_by)
    values
      (floor_id, case when floor_id::text = '10000000-0000-4000-8000-000000000001' then '101' when floor_id::text = '10000000-0000-4000-8000-000000000002' then '201' else '301' end, 3, false, null, 'triple-left-elevator', admin_user_id, admin_user_id),
      (floor_id, case when floor_id::text = '10000000-0000-4000-8000-000000000001' then '102' when floor_id::text = '10000000-0000-4000-8000-000000000002' then '202' else '302' end, 1, true, null, 'standard', admin_user_id, admin_user_id),
      (floor_id, case when floor_id::text = '10000000-0000-4000-8000-000000000001' then '103' when floor_id::text = '10000000-0000-4000-8000-000000000002' then '203' else '303' end, 1, false, null, 'standard', admin_user_id, admin_user_id),
      (floor_id, case when floor_id::text = '10000000-0000-4000-8000-000000000001' then '104' when floor_id::text = '10000000-0000-4000-8000-000000000002' then '204' else '304' end, 1, false, null, 'standard', admin_user_id, admin_user_id),
      (floor_id, case when floor_id::text = '10000000-0000-4000-8000-000000000001' then '105' when floor_id::text = '10000000-0000-4000-8000-000000000002' then '205' else '305' end, 2, false, null, 'standard', admin_user_id, admin_user_id)
    on conflict (room_number) do update
      set floor_id = excluded.floor_id,
          bed_count = excluded.bed_count,
          has_window = excluded.has_window,
          layout_key = excluded.layout_key,
          active = true,
          updated_at = now(),
          updated_by = admin_user_id;
  end loop;
end;
$$;
