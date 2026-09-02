begin;
select plan(8);

select is((select count(*)::int from public.floors), 4, 'four hotel floors are seeded');
select is((select count(*)::int from public.rooms), 17, 'seventeen hotel rooms are seeded');
select is((select bed_count from public.rooms where room_number = '101'), 3, 'room 101 has three beds');
select is((select bed_count from public.rooms where room_number = '301'), 2, 'room 301 has two beds');
select is((select has_window from public.rooms where room_number = '301'), true, 'room 301 has a window');
select is((select bed_count = 2 and has_window from public.rooms where room_number = '4B'), true, 'room 4B is a two-bed room with a window');
select is((select count(*)::int from public.rooms where has_window), 10, 'ten rooms have windows');
select is((select count(*)::int from public.profiles where username = 'admin' and role = 'owner' and active), 1, 'admin owner profile is seeded');

select * from finish();
rollback;
