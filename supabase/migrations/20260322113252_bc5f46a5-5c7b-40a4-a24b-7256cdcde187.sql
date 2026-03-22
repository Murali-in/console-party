ALTER TABLE public.approved_games
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can read approved games" ON public.approved_games;

CREATE POLICY "Anyone can read public approved games"
ON public.approved_games
FOR SELECT
USING (is_private = false);

CREATE POLICY "Admins can read all approved games"
ON public.approved_games
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));