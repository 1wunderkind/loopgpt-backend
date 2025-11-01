-- Add helper functions for metrics calculation

-- Function to get average latency
create or replace function get_avg_latency()
returns table (avg numeric) as $$
begin
  return query
  select avg(latency_ms) as avg
  from food_search_logs;
end;
$$ language plpgsql;

-- Grant execute permission
grant execute on function get_avg_latency() to anon, authenticated, service_role;

