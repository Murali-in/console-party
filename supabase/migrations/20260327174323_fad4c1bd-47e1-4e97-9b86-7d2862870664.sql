
-- Drop the duplicate overly-broad profiles SELECT policy (the existing specific ones are sufficient)
DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;

-- Make play_events insert require at least anon key (keeping it open since players don't have accounts)
-- The warnings for play_events and leaderboards INSERT are acceptable for anonymous game play
