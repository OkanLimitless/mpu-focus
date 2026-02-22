alter table public.mpu_profiles
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mpu_profiles_auth_user_id_fkey'
  ) then
    alter table public.mpu_profiles
      add constraint mpu_profiles_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists mpu_profiles_auth_user_id_unique
  on public.mpu_profiles (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists mpu_profiles_email_lower_unique
  on public.mpu_profiles (lower(email));

update public.mpu_profiles p
set auth_user_id = u.id
from auth.users u
where p.auth_user_id is null
  and u.email is not null
  and lower(u.email) = lower(p.email);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpu_profiles'
      and policyname = 'Users can read own mpu profile'
  ) then
    create policy "Users can read own mpu profile"
      on public.mpu_profiles
      for select
      to authenticated
      using (auth.uid() = auth_user_id);
  end if;
end $$;
