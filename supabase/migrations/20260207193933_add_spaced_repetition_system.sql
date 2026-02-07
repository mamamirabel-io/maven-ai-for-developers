-- Add Spaced Repetition System (SRS) fields to flashcard_progress table

-- Add new columns for SRS algorithm
alter table public.flashcard_progress 
  add column if not exists next_review_date timestamp with time zone default timezone('utc'::text, now()) not null,
  add column if not exists ease_factor numeric(3,2) default 2.50 not null check (ease_factor >= 1.30),
  add column if not exists interval_days numeric(10,2) default 0 not null check (interval_days >= 0),
  add column if not exists repetitions integer default 0 not null check (repetitions >= 0);

-- Create index for efficient querying of due cards
create index if not exists idx_flashcard_progress_next_review 
  on public.flashcard_progress(user_id, next_review_date);

-- Create function to calculate next review date using SM-2 algorithm
create or replace function public.calculate_srs_interval(
  p_ease_factor numeric,
  p_interval_days numeric,
  p_repetitions integer,
  p_quality integer
) returns table (
  new_ease_factor numeric,
  new_interval_days numeric,
  new_repetitions integer,
  new_next_review_date timestamp with time zone
) as $$
declare
  v_ease_factor numeric;
  v_interval_days numeric;
  v_repetitions integer;
begin
  -- SM-2 algorithm implementation
  -- Quality: 0 = incorrect/failed, 1-5 = correct with varying difficulty
  
  if p_quality < 3 then
    -- Failed recall - reset the card
    v_repetitions := 0;
    v_interval_days := 0;
    v_ease_factor := greatest(1.30, p_ease_factor - 0.20);
  else
    -- Successful recall - increase interval
    v_ease_factor := greatest(1.30, p_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02)));
    
    if p_repetitions = 0 then
      v_interval_days := 1;
    elsif p_repetitions = 1 then
      v_interval_days := 6;
    else
      v_interval_days := p_interval_days * v_ease_factor;
    end if;
    
    v_repetitions := p_repetitions + 1;
  end if;
  
  return query select 
    v_ease_factor,
    v_interval_days,
    v_repetitions,
    (now() at time zone 'utc' + (v_interval_days || ' days')::interval)::timestamp with time zone;
end;
$$ language plpgsql;

-- Comment on the columns
comment on column public.flashcard_progress.next_review_date is 'Next scheduled review date for this word (SRS)';
comment on column public.flashcard_progress.ease_factor is 'SM-2 ease factor (1.30-2.50+), affects interval growth';
comment on column public.flashcard_progress.interval_days is 'Current interval in days between reviews';
comment on column public.flashcard_progress.repetitions is 'Number of consecutive successful reviews';
