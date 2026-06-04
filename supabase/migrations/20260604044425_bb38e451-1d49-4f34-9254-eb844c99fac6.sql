
SET LOCAL session_replication_role = 'replica';

WITH players AS (
  SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS p_idx
  FROM public.territories WHERE owner_id IS NOT NULL
),
candidate AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn
  FROM public.cells WHERE owner_territory_id IS NULL
  ORDER BY id LIMIT 90
)
UPDATE public.cells c
SET owner_territory_id = p.id, status = 'colonized'::cell_status, colonized_at = now()
FROM candidate, players p
WHERE c.id = candidate.id AND p.p_idx = (candidate.rn / 30);

WITH villain AS (SELECT id FROM public.territories WHERE is_villain LIMIT 1),
candidate AS (SELECT id FROM public.cells WHERE owner_territory_id IS NULL ORDER BY id LIMIT 10)
UPDATE public.cells c
SET owner_territory_id = v.id, status = 'colonized'::cell_status, colonized_at = now()
FROM candidate, villain v WHERE c.id = candidate.id;
