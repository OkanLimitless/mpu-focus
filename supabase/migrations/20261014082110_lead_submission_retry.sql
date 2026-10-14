-- A signup is an enquiry, not a unique account. Returning prospects must be
-- able to enquire again without overwriting previous notes/status/attribution.
alter table public.mpu_signups
  add column if not exists request_id uuid,
  add column if not exists request_fingerprint text;

create unique index if not exists mpu_signups_request_id_unique
  on public.mpu_signups (request_id) where request_id is not null;

drop index if exists public.mpu_signups_email_unique;
create index if not exists mpu_signups_email_idx
  on public.mpu_signups (lower(email));

comment on column public.mpu_signups.request_id is
  'Random per-submission idempotency key. Retries return the original receipt; new enquiries get new keys.';
comment on column public.mpu_signups.request_fingerprint is
  'Server-computed normalized input digest; rejects reuse of a key for different enquiry data.';
