
-- Game ratings table
CREATE TABLE IF NOT EXISTS public.game_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);
ALTER TABLE public.game_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON public.game_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ratings" ON public.game_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.game_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Forum posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text,
  author_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.forum_posts(id),
  pinned boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read forum posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins can delete posts" ON public.forum_posts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add portfolio fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS github_username text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS portfolio_accent text DEFAULT '#bfbfbf',
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS games_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_wins integer NOT NULL DEFAULT 0;

-- Play events for analytics
CREATE TABLE IF NOT EXISTS public.play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  session_id text,
  device_type text,
  duration_s integer,
  played_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert play events" ON public.play_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read play events" ON public.play_events FOR SELECT USING (true);

-- Public read policy for profiles (for portfolio pages)
CREATE POLICY "Anyone can read public profiles" ON public.profiles FOR SELECT USING (true);
