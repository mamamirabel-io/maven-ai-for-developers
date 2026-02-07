-- Add language preference columns to profiles table
alter table public.profiles
  add column if not exists native_language text default 'English',
  add column if not exists target_language text default 'Spanish';

-- Add comment to describe the columns
comment on column public.profiles.native_language is 'User''s native language for translations';
comment on column public.profiles.target_language is 'User''s target language for learning';
