create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  description text,
  ingredients_have jsonb,
  ingredients_need jsonb,
  instructions jsonb,
  metadata jsonb
);

alter table recipes enable row level security;

create policy "Public recipes are viewable by everyone"
  on recipes for select
  using ( true );

create policy "Anyone can insert recipes"
  on recipes for insert
  with check ( true );
