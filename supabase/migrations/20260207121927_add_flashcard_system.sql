-- Add translation field to words table
alter table public.words add column translation text;

-- Update existing words with placeholder translations (you can update these later)
update public.words set translation = 'Translation for ' || word where translation is null;

-- Create flashcard_progress table to track user progress
create table public.flashcard_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  correct_count integer default 0 not null,
  incorrect_count integer default 0 not null,
  last_practiced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, word_id)
);

-- Enable Row Level Security
alter table public.flashcard_progress enable row level security;

-- Create policies for flashcard_progress table
-- Allow users to view their own progress
create policy "Users can view their own flashcard progress"
  on public.flashcard_progress
  for select
  using (auth.uid() = user_id);

-- Allow users to insert their own progress
create policy "Users can insert their own flashcard progress"
  on public.flashcard_progress
  for insert
  with check (auth.uid() = user_id);

-- Allow users to update their own progress
create policy "Users can update their own flashcard progress"
  on public.flashcard_progress
  for update
  using (auth.uid() = user_id);

-- Create function to update timestamp
create or replace function public.update_flashcard_progress_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update timestamp
create trigger update_flashcard_progress_timestamp
  before update on public.flashcard_progress
  for each row execute procedure public.update_flashcard_progress_timestamp();

-- Create view for flashcard statistics
create or replace view public.flashcard_stats as
select 
  user_id,
  count(*) as total_words_practiced,
  sum(correct_count) as total_correct,
  sum(incorrect_count) as total_incorrect,
  round(
    case 
      when sum(correct_count + incorrect_count) > 0 
      then (sum(correct_count)::numeric / sum(correct_count + incorrect_count)::numeric) * 100 
      else 0 
    end, 
    2
  ) as accuracy_percentage
from public.flashcard_progress
group by user_id;
