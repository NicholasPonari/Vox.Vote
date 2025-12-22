-- Users table (managed by Supabase Auth, but can extend with profile info)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  first_name text,
  last_name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Issues table
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  title text not null,
  narrative text not null,
  image_url text,
  type text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Votes table
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  value integer not null check (value in (-1, 1)),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, issue_id)
);

-- Comments table (threaded)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  parent_id uuid references comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for fast comment lookup by parent
create index if not exists idx_comments_parent on comments(parent_id);
