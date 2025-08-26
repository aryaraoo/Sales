-- Update conversations table to include status column and fix feedback type
alter table public.conversations 
add column if not exists status text default 'active' check (status in ('active', 'completed', 'terminated'));

-- Change feedback column to jsonb for better structure
alter table public.conversations 
alter column feedback type jsonb using feedback::jsonb;

-- Add indexes for better performance
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_created_at_idx on public.conversations(created_at desc);
create index if not exists conversations_scenario_type_idx on public.conversations(scenario_type);

-- Create user_sessions table for tracking active sessions
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  session_token text not null unique,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_activity timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  status text default 'active' check (status in ('active', 'ended', 'expired'))
);

-- Enable RLS on user_sessions
alter table public.user_sessions enable row level security;

-- Create policies for user_sessions
create policy "user_sessions_select_own"
  on public.user_sessions for select
  using (auth.uid() = user_id);

create policy "user_sessions_insert_own"
  on public.user_sessions for insert
  with check (auth.uid() = user_id);

create policy "user_sessions_update_own"
  on public.user_sessions for update
  using (auth.uid() = user_id);

create policy "user_sessions_delete_own"
  on public.user_sessions for delete
  using (auth.uid() = user_id);

-- Add indexes for user_sessions
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists user_sessions_token_idx on public.user_sessions(session_token);
create index if not exists user_sessions_status_idx on public.user_sessions(status);

-- Create function to automatically end expired sessions
create or replace function end_expired_sessions()
returns void
language plpgsql
security definer
as $$
begin
  update public.user_sessions
  set status = 'expired', ended_at = now()
  where status = 'active'
  and last_activity < now() - interval '1 hour';
end;
$$;
