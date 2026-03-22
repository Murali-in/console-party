CREATE POLICY "Admins can delete submissions"
ON public.submitted_games
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));