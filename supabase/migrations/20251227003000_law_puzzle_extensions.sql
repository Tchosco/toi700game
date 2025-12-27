-- Extend laws table with puzzle-related fields
ALTER TABLE public.laws
ADD COLUMN IF NOT EXISTS synergy_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rural_popularity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS urban_popularity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blocks JSON,
ADD COLUMN IF NOT EXISTS puzzle_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS puzzle_notes JSON;

-- Optional: comment for clarity
COMMENT ON COLUMN public.laws.synergy_score IS 'Aggregated synergy score from coherent LawBlock tag combinations';
COMMENT ON COLUMN public.laws.rural_popularity IS 'Popularity among rural population (0-100)';
COMMENT ON COLUMN public.laws.urban_popularity IS 'Popularity among urban population (0-100)';
COMMENT ON COLUMN public.laws.tags IS 'Aggregated tags from LawBlocks';
COMMENT ON COLUMN public.laws.blocks IS 'LawBlocks payload used to build the law';
COMMENT ON COLUMN public.laws.puzzle_valid IS 'Whether the law passed puzzle validation';
COMMENT ON COLUMN public.laws.puzzle_notes IS 'Notes about puzzle validation, annulled effects, tier penalties, contradictions';