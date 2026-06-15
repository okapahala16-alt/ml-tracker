-- ================================================================
-- ML Tracker — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ================================================================


-- ================================================================
-- TABLES
-- ================================================================

-- 1. seasons
CREATE TABLE IF NOT EXISTS public.seasons (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  start_date date,
  end_date   date,
  is_active  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.seasons IS 'Ranked seasons, e.g. "Season 1 2024"';

-- 2. heroes
CREATE TABLE IF NOT EXISTS public.heroes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  role      text CHECK (role IN ('tank', 'fighter', 'mage', 'marksman', 'assassin', 'support')),
  image_url text
);

COMMENT ON TABLE public.heroes IS 'Mobile Legends hero roster';

-- 3. matches
CREATE TABLE IF NOT EXISTS public.matches (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id  uuid        REFERENCES public.seasons(id) ON DELETE SET NULL,
  match_date date        NOT NULL,
  result     text        NOT NULL CHECK (result IN ('win', 'loss')),
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.matches IS 'Individual match records';

-- 4. match_players
CREATE TABLE IF NOT EXISTS public.match_players (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  hero_id    uuid        REFERENCES public.heroes(id) ON DELETE SET NULL,
  kills      integer     NOT NULL DEFAULT 0 CHECK (kills >= 0),
  deaths     integer     NOT NULL DEFAULT 0 CHECK (deaths >= 0),
  assists    integer     NOT NULL DEFAULT 0 CHECK (assists >= 0),
  rating     numeric(4,1) CHECK (rating >= 0.0 AND rating <= 10.0),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.match_players IS 'Per-player stats for each match';

-- 5. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text        NOT NULL UNIQUE,
  display_name text,
  is_admin     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Public user profile, auto-created on registration';


-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_matches_season_id   ON public.matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_by  ON public.matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_date_desc   ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_mp_match_id         ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_mp_user_id          ON public.match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_hero_id          ON public.match_players(hero_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON public.profiles(username);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heroes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- seasons — read for all authenticated, write for admins only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "seasons: authenticated can read" ON public.seasons;
CREATE POLICY "seasons: authenticated can read"
  ON public.seasons FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "seasons: admin can insert" ON public.seasons;
CREATE POLICY "seasons: admin can insert"
  ON public.seasons FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "seasons: admin can update" ON public.seasons;
CREATE POLICY "seasons: admin can update"
  ON public.seasons FOR UPDATE
  TO authenticated
  USING     ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- ----------------------------------------------------------------
-- heroes — read-only for all authenticated users
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "heroes: authenticated can read" ON public.heroes;
CREATE POLICY "heroes: authenticated can read"
  ON public.heroes FOR SELECT
  TO authenticated
  USING (true);


-- ----------------------------------------------------------------
-- matches
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "matches: authenticated can read" ON public.matches;
CREATE POLICY "matches: authenticated can read"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "matches: owner can insert" ON public.matches;
CREATE POLICY "matches: owner can insert"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "matches: owner can update" ON public.matches;
CREATE POLICY "matches: owner can update"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "matches: owner can delete" ON public.matches;
CREATE POLICY "matches: owner can delete"
  ON public.matches FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());


-- ----------------------------------------------------------------
-- match_players
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "match_players: authenticated can read" ON public.match_players;
CREATE POLICY "match_players: authenticated can read"
  ON public.match_players FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "match_players: owner can insert" ON public.match_players;
CREATE POLICY "match_players: owner can insert"
  ON public.match_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_players: owner can update" ON public.match_players;
CREATE POLICY "match_players: owner can update"
  ON public.match_players FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "match_players: owner can delete" ON public.match_players;
CREATE POLICY "match_players: owner can delete"
  ON public.match_players FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles: authenticated can read" ON public.profiles;
CREATE POLICY "profiles: authenticated can read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT is handled by the trigger (SECURITY DEFINER), but allow
-- authenticated insert so users can manually upsert their own profile
-- if the trigger ever fires before the session is established.
DROP POLICY IF EXISTS "profiles: user can insert own" ON public.profiles;
CREATE POLICY "profiles: user can insert own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles: user can update own" ON public.profiles;
CREATE POLICY "profiles: user can update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ================================================================
-- TRIGGER — auto-create profile on new user registration
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  suffix        text;
BEGIN
  -- Prefer username from metadata, fall back to email prefix
  base_username := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );

  -- Sanitize: lowercase, replace non-alphanumeric with underscore
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g'));

  final_username := base_username;

  -- Ensure uniqueness: append short id suffix on conflict
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    suffix        := substr(replace(new.id::text, '-', ''), 1, 6);
    final_username := base_username || '_' || suffix;
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    final_username,
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'display_name'), ''),
      final_username
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Drop existing trigger first to allow re-running the migration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- SEED DATA — Mobile Legends Heroes (39 heroes)
-- ================================================================

INSERT INTO public.heroes (name, role) VALUES
  -- Tank
  ('Tigreal',     'tank'),
  ('Minotaur',    'tank'),
  ('Lolita',      'tank'),
  ('Gatotkaca',   'tank'),
  ('Jawhead',     'tank'),
  ('Johnson',     'tank'),

  -- Fighter
  ('Balmond',     'fighter'),
  ('Alucard',     'fighter'),
  ('Bane',        'fighter'),
  ('Zilong',      'fighter'),
  ('Lapu-Lapu',   'fighter'),
  ('Freya',       'fighter'),
  ('Hilda',       'fighter'),
  ('Argus',       'fighter'),
  ('Martis',      'fighter'),

  -- Mage
  ('Alice',       'mage'),
  ('Eudora',      'mage'),
  ('Gord',        'mage'),
  ('Valir',       'mage'),
  ('Odette',      'mage'),
  ('Aurora',      'mage'),
  ('Harley',      'mage'),
  ('Lunox',       'mage'),
  ('Vale',        'mage'),

  -- Marksman
  ('Layla',       'marksman'),
  ('Miya',        'marksman'),
  ('Clint',       'marksman'),
  ('Moskov',      'marksman'),
  ('Irithel',     'marksman'),
  ('Lesley',      'marksman'),
  ('Karrie',      'marksman'),
  ('Claude',      'marksman'),

  -- Assassin
  ('Saber',       'assassin'),
  ('Fanny',       'assassin'),
  ('Hayabusa',    'assassin'),

  -- Support
  ('Nana',        'support'),
  ('Rafaela',     'support'),
  ('Angela',      'support'),
  ('Diggie',      'support')

ON CONFLICT (name) DO NOTHING;


-- ================================================================
-- SEED DATA — Default active season
-- ================================================================

INSERT INTO public.seasons (name, start_date, is_active)
VALUES ('Season 1 2024', '2024-01-01', true)
ON CONFLICT DO NOTHING;
