CREATE TABLE public.leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  player_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  is_winner boolean NOT NULL DEFAULT false,
  room_code text,
  played_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboards"
  ON public.leaderboards FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert leaderboard entries"
  ON public.leaderboards FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_leaderboards_game_id ON public.leaderboards (game_id);
CREATE INDEX idx_leaderboards_score ON public.leaderboards (game_id, score DESC);