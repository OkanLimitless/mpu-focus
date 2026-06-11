-- Quiz system, client payments (finance), and onboarding agreements.

-- ---------------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------------
create table if not exists public.mpu_quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  chapter_id uuid references public.mpu_video_chapters(id) on delete set null,
  pass_percentage integer not null default 70 check (pass_percentage between 0 and 100),
  order_index integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.mpu_quizzes(id) on delete cascade,
  question text not null,
  question_type text not null default 'multiple_choice' check (question_type in ('multiple_choice', 'open')),
  -- multiple_choice: [{ "id": "a", "text": "...", "isCorrect": true }]
  options jsonb not null default '[]'::jsonb,
  explanation text,
  points integer not null default 1 check (points > 0),
  order_index integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpu_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.mpu_quizzes(id) on delete cascade,
  profile_id uuid not null references public.mpu_profiles(id) on delete cascade,
  -- [{ "questionId": "...", "selectedOptionIds": ["a"], "answerText": "...",
  --    "isCorrect": true, "pointsAwarded": 1, "maxPoints": 1, "needsReview": false }]
  answers jsonb not null default '[]'::jsonb,
  score numeric not null default 0,
  max_score numeric not null default 0,
  percentage integer not null default 0,
  passed boolean,
  needs_review boolean not null default false,
  reviewed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpu_quizzes_chapter_idx on public.mpu_quizzes (chapter_id, order_index);
create index if not exists mpu_quiz_questions_quiz_idx on public.mpu_quiz_questions (quiz_id, order_index);
create index if not exists mpu_quiz_attempts_profile_idx on public.mpu_quiz_attempts (profile_id, completed_at desc);
create index if not exists mpu_quiz_attempts_quiz_idx on public.mpu_quiz_attempts (quiz_id, completed_at desc);

-- ---------------------------------------------------------------------------
-- Finance: agreed package price per client + payments ledger
-- ---------------------------------------------------------------------------
alter table public.mpu_profiles
  add column if not exists package_price_cents integer,
  add column if not exists finance_notes text;

create table if not exists public.mpu_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.mpu_profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null default 'cash' check (method in ('cash', 'bank_transfer', 'paypal', 'other')),
  note text,
  paid_at timestamptz not null default timezone('utc', now()),
  recorded_by uuid references public.mpu_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpu_payments_profile_idx on public.mpu_payments (profile_id, paid_at desc);
create index if not exists mpu_payments_paid_at_idx on public.mpu_payments (paid_at desc);

-- ---------------------------------------------------------------------------
-- Onboarding agreements (contract signature + ID document)
-- ---------------------------------------------------------------------------
create table if not exists public.mpu_agreements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.mpu_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'rejected')),
  contract_version text not null default 'v1',
  contract_text text,
  full_name text,
  birth_date date,
  address text,
  signature_data text,
  signed_at timestamptz,
  signed_ip text,
  signed_user_agent text,
  id_document_url text,
  id_document_name text,
  id_document_uploaded_at timestamptz,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Generic settings (e.g. editable agreement template)
-- ---------------------------------------------------------------------------
create table if not exists public.mpu_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- updated_at triggers + RLS (service role bypasses RLS; no public policies)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['mpu_quizzes', 'mpu_quiz_questions', 'mpu_quiz_attempts', 'mpu_payments', 'mpu_agreements']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.mpu_touch_updated_at()',
      t || '_touch_updated_at', t
    );
    execute format('alter table public.%I enable row level security', t);
  end loop;

  execute 'alter table public.mpu_settings enable row level security';
end $$;
