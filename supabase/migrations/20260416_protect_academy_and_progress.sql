alter table public.mpu_profiles
  add column if not exists academy_access_enabled boolean not null default false;

drop policy if exists "Public can read published mpu videos" on public.mpu_video_library;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpu_video_library'
      and policyname = 'Authorized academy users can read published videos'
  ) then
    create policy "Authorized academy users can read published videos"
      on public.mpu_video_library
      for select
      to authenticated
      using (
        is_published = true
        and exists (
          select 1
          from public.mpu_profiles p
          where p.auth_user_id = auth.uid()
            and p.is_active = true
            and (p.role = 'admin' or p.academy_access_enabled = true)
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpu_video_progress'
      and policyname = 'Users can read own progress'
  ) then
    create policy "Users can read own progress"
      on public.mpu_video_progress
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.mpu_profiles p
          where p.id = profile_id
            and p.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpu_video_progress'
      and policyname = 'Users can write own progress'
  ) then
    create policy "Users can write own progress"
      on public.mpu_video_progress
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.mpu_profiles p
          where p.id = profile_id
            and p.auth_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.mpu_profiles p
          where p.id = profile_id
            and p.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;
