-- Create tool_choice_log table for debugging tool selection
create table if not exists tool_choice_log (
  id uuid primary key default uuid_generate_v4(),
  input_query text not null,
  chosen_tool text not null,
  confidence numeric(3,2),
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_tool_choice_log_timestamp on tool_choice_log(timestamp desc);
create index if not exists idx_tool_choice_log_chosen_tool on tool_choice_log(chosen_tool);

-- RLS policies (allow service role to insert, admins to read)
alter table tool_choice_log enable row level security;

create policy "Service role can insert tool choice logs"
  on tool_choice_log
  for insert
  to service_role
  with check (true);

create policy "Admins can read tool choice logs"
  on tool_choice_log
  for select
  using (true); -- Public read for monitoring

-- Grant permissions
grant select on tool_choice_log to anon, authenticated;
grant insert on tool_choice_log to service_role;

comment on table tool_choice_log is 'Logs tool selection for routing accuracy analysis and QA';

