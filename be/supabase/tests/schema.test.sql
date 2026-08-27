begin;
select plan(5);

select is((select count(*)::int from public.floors), 3, 'three hotel floors are seeded');
select is((select count(*)::int from public.rooms), 15, 'fifteen hotel rooms are seeded');
select is((select bed_count from public.rooms where room_number = '101'), 3, 'room 101 has three beds');
select is((select bed_count from public.rooms where room_number = '105'), 2, 'room 105 has two beds');
select is((select count(*)::int from public.profiles where username = 'admin' and role = 'owner' and active), 1, 'admin owner profile is seeded');

select * from finish();
rollback;
