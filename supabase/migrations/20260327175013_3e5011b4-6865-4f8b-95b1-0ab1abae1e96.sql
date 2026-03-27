
-- Allow anyone to read basic profile info (for portfolios, contributor lists, forum author names)
CREATE POLICY "Public can read profiles" ON public.profiles FOR SELECT USING (true);

-- Drop the overly restrictive existing policies that are now redundant
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
