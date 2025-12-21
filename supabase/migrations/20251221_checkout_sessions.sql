create table if not exists checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  status text not null check (status in ('created', 'redirected', 'expired', 'failed')),
  recipe_id text,
  missing_items jsonb,
  provider_checkout_url text,
  last_error text
);

-- Index for fast lookup by hash
create index idx_checkout_sessions_hash on checkout_sessions(token_hash);

-- RLS Policies (Internal only, no public access)
alter table checkout_sessions enable row level security;
