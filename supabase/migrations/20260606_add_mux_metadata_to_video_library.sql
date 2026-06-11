alter table public.mpu_video_library
  add column if not exists mux_asset_id text,
  add column if not exists mux_playback_id text,
  add column if not exists mux_status text;

create index if not exists mpu_video_library_mux_asset_id_idx
  on public.mpu_video_library (mux_asset_id);

create index if not exists mpu_video_library_mux_playback_id_idx
  on public.mpu_video_library (mux_playback_id);

update public.mpu_video_library
set mux_playback_id = substring(video_url from 'stream\\.mux\\.com/([A-Za-z0-9]+)')
where mux_playback_id is null
  and video_url like 'https://stream.mux.com/%';
