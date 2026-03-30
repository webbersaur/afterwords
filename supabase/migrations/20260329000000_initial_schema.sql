-- ============================================
-- AfterWords — Initial Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- Profiles (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  diagnosis text,         -- e.g. "Squamous Cell Carcinoma"
  care_circle_slug text unique,  -- URL slug for their care circle page
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Recaps (visit recordings + AI summaries)
-- ============================================
create table public.recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text default 'Visit Recap',
  audio_path text,             -- path in storage bucket
  transcript text,             -- full transcript from Whisper
  summary jsonb,               -- structured AI summary sections
  status text default 'pending' check (status in ('pending','transcribing','summarizing','complete','error')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_recaps_user on public.recaps(user_id);

-- ============================================
-- Care Circle Posts
-- ============================================
create table public.care_circle_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recap_id uuid references public.recaps(id) on delete set null,
  note text,                    -- personal note from patient
  photo_path text,              -- path in storage bucket
  shared_sections text[],       -- which recap sections were shared
  created_at timestamptz default now()
);

create index idx_cc_posts_user on public.care_circle_posts(user_id);

-- ============================================
-- Support Messages (from friends/family)
-- ============================================
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.care_circle_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  message text not null,
  created_at timestamptz default now()
);

create index idx_support_messages_post on public.support_messages(post_id);

-- ============================================
-- Row Level Security
-- ============================================

-- Profiles: users can read/update their own
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Recaps: users can CRUD their own
alter table public.recaps enable row level security;

create policy "Users can view own recaps"
  on public.recaps for select using (auth.uid() = user_id);

create policy "Users can insert own recaps"
  on public.recaps for insert with check (auth.uid() = user_id);

create policy "Users can update own recaps"
  on public.recaps for update using (auth.uid() = user_id);

create policy "Users can delete own recaps"
  on public.recaps for delete using (auth.uid() = user_id);

-- Care Circle Posts: owner can CRUD, anyone can read (public care circle)
alter table public.care_circle_posts enable row level security;

create policy "Anyone can view care circle posts"
  on public.care_circle_posts for select using (true);

create policy "Users can insert own posts"
  on public.care_circle_posts for insert with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.care_circle_posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.care_circle_posts for delete using (auth.uid() = user_id);

-- Support Messages: anyone can read, authenticated users can insert
alter table public.support_messages enable row level security;

create policy "Anyone can view support messages"
  on public.support_messages for select using (true);

create policy "Authenticated users can send messages"
  on public.support_messages for insert with check (auth.uid() = user_id);

-- ============================================
-- Storage Buckets
-- ============================================
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);

-- Storage policies: users can upload/read their own recordings
create policy "Users can upload recordings"
  on storage.objects for insert
  with check (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read own recordings"
  on storage.objects for select
  using (bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]);

-- Photos bucket: users upload to their folder, anyone can read (public care circle)
create policy "Users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');
