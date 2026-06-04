
SET LOCAL session_replication_role = 'replica';

UPDATE public.territories t
SET total_rural_population = sub.rural,
    total_urban_population = sub.urban,
    updated_at = now()
FROM (
  SELECT owner_territory_id AS tid,
         coalesce(sum(rural_population),0)::int AS rural,
         coalesce(sum(urban_population),0)::int AS urban
  FROM public.cells WHERE owner_territory_id IS NOT NULL
  GROUP BY owner_territory_id
) sub WHERE t.id = sub.tid;
