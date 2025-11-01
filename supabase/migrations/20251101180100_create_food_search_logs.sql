-- Create food_search_logs table for tracking food resolver queries
-- This enables performance monitoring and analytics

create table if not exists food_search_logs (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  result_count int not null,
  latency_ms numeric(8,3) not null,
  success boolean default true,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists food_search_logs_created_at_idx on food_search_logs (created_at desc);
create index if not exists food_search_logs_user_id_idx on food_search_logs (user_id);
create index if not exists food_search_logs_success_idx on food_search_logs (success);

-- Add RLS policies
alter table food_search_logs enable row level security;

-- Users can only see their own logs
create policy "Users can view own search logs"
  on food_search_logs
  for select
  using (auth.uid() = user_id);

-- Service role can insert logs
create policy "Service role can insert logs"
  on food_search_logs
  for insert
  with check (true);

-- Admin users can view all logs
create policy "Admin users can view all logs"
  on food_search_logs
  for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add comment
comment on table food_search_logs is 'Tracks all food resolver queries for performance monitoring and analytics';

