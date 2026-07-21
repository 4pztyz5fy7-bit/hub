DELETE FROM public.team_positions tp
WHERE tp.is_system = false
  AND tp.is_leadership = true
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.position_id = tp.id
  );