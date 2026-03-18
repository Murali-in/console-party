
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'developer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  role app_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if this is the first user (for auto-admin)
CREATE OR REPLACE FUNCTION public.is_first_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1)
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  IF public.is_first_user() THEN
    _role := 'admin';
  ELSE
    _role := 'user';
  END IF;
  
  INSERT INTO public.profiles (user_id, email, username, role)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1), _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create submitted_games table
CREATE TABLE public.submitted_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 4,
  github_url TEXT NOT NULL,
  demo_url TEXT,
  cover_image_url TEXT,
  submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.submitted_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters can read own submissions" ON public.submitted_games
  FOR SELECT USING (auth.uid() = submitter_id);

CREATE POLICY "Admins can read all submissions" ON public.submitted_games
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can submit games" ON public.submitted_games
  FOR INSERT WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Admins can update submissions" ON public.submitted_games
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create approved_games table
CREATE TABLE public.approved_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 4,
  cover_image_url TEXT,
  game_type TEXT NOT NULL DEFAULT 'community',
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.approved_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved games" ON public.approved_games
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert approved games" ON public.approved_games
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update approved games" ON public.approved_games
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete approved games" ON public.approved_games
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for game covers
INSERT INTO storage.buckets (id, name, public) VALUES ('game-covers', 'game-covers', true);

CREATE POLICY "Anyone can view game covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'game-covers');

CREATE POLICY "Authenticated users can upload game covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'game-covers' AND auth.role() = 'authenticated');
