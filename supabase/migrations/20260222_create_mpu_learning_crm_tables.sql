create extension if not exists pgcrypto;

create table if not exists public.mpu_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_video_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  category text not null default 'general',
  order_index integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  goals text,
  status text not null default 'new' check (status in ('new', 'contacted', 'enrolled', 'closed')),
  notes text,
  tags text[] not null default '{}',
  source text not null default 'website',
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_video_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mpu_profiles(id) on delete cascade,
  video_id uuid not null references public.mpu_video_library(id) on delete cascade,
  completion_percentage numeric(5,2) not null default 0,
  last_position_seconds integer not null default 0,
  is_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, video_id)
);

create unique index if not exists mpu_signups_email_unique on public.mpu_signups (lower(email));
create index if not exists mpu_signups_status_idx on public.mpu_signups (status);
create index if not exists mpu_signups_created_at_idx on public.mpu_signups (created_at desc);
create index if not exists mpu_video_library_category_idx on public.mpu_video_library (category, order_index);

create or replace function public.mpu_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists mpu_profiles_touch_updated_at on public.mpu_profiles;
create trigger mpu_profiles_touch_updated_at
before update on public.mpu_profiles
for each row execute function public.mpu_touch_updated_at();

drop trigger if exists mpu_video_library_touch_updated_at on public.mpu_video_library;
create trigger mpu_video_library_touch_updated_at
before update on public.mpu_video_library
for each row execute function public.mpu_touch_updated_at();

drop trigger if exists mpu_signups_touch_updated_at on public.mpu_signups;
create trigger mpu_signups_touch_updated_at
before update on public.mpu_signups
for each row execute function public.mpu_touch_updated_at();

drop trigger if exists mpu_video_progress_touch_updated_at on public.mpu_video_progress;
create trigger mpu_video_progress_touch_updated_at
before update on public.mpu_video_progress
for each row execute function public.mpu_touch_updated_at();

alter table public.mpu_profiles enable row level security;
alter table public.mpu_video_library enable row level security;
alter table public.mpu_signups enable row level security;
alter table public.mpu_video_progress enable row level security;

create policy "Public can read published mpu videos"
on public.mpu_video_library
for select
to anon, authenticated
using (is_published = true);

create policy "Public can submit mpu signups"
on public.mpu_signups
for insert
to anon, authenticated
with check (true);

insert into public.mpu_video_library (title, description, video_url, category, order_index, is_published)
select 'Welcome to MPU Focus', 'Platform orientation and study plan overview.', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'onboarding', 1, true
where not exists (select 1 from public.mpu_video_library);

insert into public.mpu_video_library (title, description, video_url, category, order_index, is_published)
select 'Mindset for MPU Success', 'How to prepare mentally and avoid common mistakes.', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'mindset', 2, true
where not exists (select 1 from public.mpu_video_library where order_index = 2);

insert into public.mpu_video_library (title, description, video_url, category, order_index, is_published)
select 'Interview Preparation Basics', 'Core structure and sample response frameworks.', 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 'interview', 3, true
where not exists (select 1 from public.mpu_video_library where order_index = 3);
