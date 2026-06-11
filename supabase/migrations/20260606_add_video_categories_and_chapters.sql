create table if not exists public.mpu_video_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_video_chapters (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.mpu_video_categories(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (category_id, slug)
);

alter table public.mpu_video_library
  add column if not exists chapter_id uuid references public.mpu_video_chapters(id) on delete set null;

create index if not exists mpu_video_categories_order_idx
  on public.mpu_video_categories (order_index, name);

create index if not exists mpu_video_chapters_category_order_idx
  on public.mpu_video_chapters (category_id, order_index, title);

create index if not exists mpu_video_library_chapter_order_idx
  on public.mpu_video_library (chapter_id, order_index);

drop trigger if exists mpu_video_categories_touch_updated_at on public.mpu_video_categories;
create trigger mpu_video_categories_touch_updated_at
before update on public.mpu_video_categories
for each row execute function public.mpu_touch_updated_at();

drop trigger if exists mpu_video_chapters_touch_updated_at on public.mpu_video_chapters;
create trigger mpu_video_chapters_touch_updated_at
before update on public.mpu_video_chapters
for each row execute function public.mpu_touch_updated_at();

alter table public.mpu_video_categories enable row level security;
alter table public.mpu_video_chapters enable row level security;

drop policy if exists "Authorized academy users can read video categories" on public.mpu_video_categories;
create policy "Authorized academy users can read video categories"
  on public.mpu_video_categories
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.mpu_profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'admin'
    )
  );

drop policy if exists "Authorized academy users can read video chapters" on public.mpu_video_chapters;
create policy "Authorized academy users can read video chapters"
  on public.mpu_video_chapters
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.mpu_profiles p
      where p.auth_user_id = auth.uid()
        and p.is_active = true
        and p.role = 'admin'
    )
  );

insert into public.mpu_video_categories (name, slug, description, order_index)
select 'Allgemein', 'general', 'Standard-Kategorie fuer bestehende Videos.', 1
where not exists (
  select 1 from public.mpu_video_categories where slug = 'general'
);

insert into public.mpu_video_chapters (category_id, title, slug, description, order_index)
select c.id, 'Start', 'start', 'Standard-Kapitel fuer bestehende Videos.', 1
from public.mpu_video_categories c
where c.slug = 'general'
  and not exists (
    select 1
    from public.mpu_video_chapters ch
    where ch.category_id = c.id
      and ch.slug = 'start'
  );

update public.mpu_video_library v
set chapter_id = ch.id,
    category = 'general'
from public.mpu_video_categories c
join public.mpu_video_chapters ch on ch.category_id = c.id and ch.slug = 'start'
where c.slug = 'general'
  and v.chapter_id is null;
