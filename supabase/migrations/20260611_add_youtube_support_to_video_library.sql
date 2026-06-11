-- Allow videos to be hosted on YouTube as an alternative to Mux.
do $$
begin
  if to_regclass('public.mpu_video_library') is not null then
    alter table public.mpu_video_library
      add column if not exists provider text not null default 'mux',
      add column if not exists youtube_video_id text;

    create index if not exists mpu_video_library_youtube_video_id_idx
      on public.mpu_video_library (youtube_video_id);
  end if;

  if to_regclass('public.video_assets') is not null then
    alter table public.video_assets
      add column if not exists provider text not null default 'mux',
      add column if not exists youtube_video_id text;
  end if;
end $$;
