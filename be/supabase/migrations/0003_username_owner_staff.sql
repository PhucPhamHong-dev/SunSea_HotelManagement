-- Authentication identity migration: username login and the two supported roles.

alter type public.profile_role rename to profile_role_legacy;
create type public.profile_role as enum ('staff', 'owner');

alter table public.profiles alter column role drop default;
alter table public.profiles
  alter column role type public.profile_role
  using case when role::text = 'owner' then 'owner'::public.profile_role else 'staff'::public.profile_role end;

drop type public.profile_role_legacy;

alter table public.profiles add column username text;

update public.profiles p
set username = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id and p.username is null;

update public.profiles
set username = lower('user_' || replace(id::text, '-', ''))
where username is null;

alter table public.profiles alter column username set not null;
alter table public.profiles alter column role set default 'staff'::public.profile_role;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]*$');
create unique index profiles_username_lower_unique_idx on public.profiles (lower(username));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role, active)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'staff',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
