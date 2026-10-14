-- Apply before deploying the Focus lander. Existing RLS remains service-only.
alter table public.mpu_signups
  add column if not exists acquisition jsonb not null default '{}'::jsonb;
comment on column public.mpu_signups.acquisition is
  'Server-assigned website, landing page, region, channel, consent and consented campaign attribution. Not editable as CRM notes.';
alter table public.mpu_signups
  add column if not exists notification_status text not null default 'disabled'
  check (notification_status in ('disabled', 'pending', 'sent', 'failed'));
