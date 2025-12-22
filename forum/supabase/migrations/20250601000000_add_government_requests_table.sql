-- Create government_requests table for tracking government official signup requests
create table if not exists public.government_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  role text not null,
  position text not null,
  organization text not null,
  jurisdiction text not null,
  message text,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id),
  notes text
);

-- Create index for faster lookups
create index if not exists idx_government_requests_status on public.government_requests(status);
create index if not exists idx_government_requests_email on public.government_requests(email);

-- Enable RLS
alter table public.government_requests enable row level security;

-- Only service role can access this table (admin only)
-- No public policies - all access through service role key
