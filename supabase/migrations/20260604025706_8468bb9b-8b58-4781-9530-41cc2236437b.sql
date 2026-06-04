
-- Extend vote_type enum
ALTER TYPE public.vote_type ADD VALUE IF NOT EXISTS 'justice_election';
ALTER TYPE public.vote_type ADD VALUE IF NOT EXISTS 'supreme_court_ruling';
ALTER TYPE public.vote_type ADD VALUE IF NOT EXISTS 'amendment';
