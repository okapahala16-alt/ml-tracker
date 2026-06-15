-- ================================================================
-- ML Tracker — Squad Session Schema
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ================================================================


-- ================================================================
-- 1. Add color to profiles
-- ================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#6366f1';

-- Assign unique colors to existing users based on their creation order
DO $$
DECLARE
  colors text[] := ARRAY[
    '#6366f1', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
    '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48'
  ];
  rec record;
  i integer := 0;
BEGIN
  FOR rec IN SELECT id FROM public.profiles ORDER BY created_at ASC LOOP
    UPDATE public.profiles
    SET color = colors[(i % array_length(colors, 1)) + 1]
    WHERE id = rec.id AND color = '#6366f1';
    i := i + 1;
  END LOOP;
END;
$$;

-- Update trigger to assign color on new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username  text;
  final_username text;
  suffix         text;
  colors         text[] := ARRAY[
    '#6366f1', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
    '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48'
  ];
  user_count     integer;
BEGIN
  base_username := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  base_username  := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g'));
  final_username := base_username;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    suffix        := substr(replace(new.id::text, '-', ''), 1, 6);
    final_username := base_username || '_' || suffix;
  END IF;

  SELECT COUNT(*) INTO user_count FROM public.profiles;

  INSERT INTO public.profiles (id, username, display_name, color)
  VALUES (
    new.id,
    final_username,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'display_name'), ''), final_username),
    colors[(user_count % array_length(colors, 1)) + 1]
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;


-- ================================================================
-- 2. squad_sessions
-- ================================================================

CREATE TABLE IF NOT EXISTS public.squad_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  invite_code text        NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ================================================================
-- 3. squad_members — who is in the session
-- ================================================================

CREATE TABLE IF NOT EXISTS public.squad_members (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_session_id uuid        NOT NULL REFERENCES public.squad_sessions(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (squad_session_id, user_id)
);


-- ================================================================
-- 4. squad_matches — each uploaded match in a session
-- ================================================================

CREATE TABLE IF NOT EXISTS public.squad_matches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_session_id uuid        NOT NULL REFERENCES public.squad_sessions(id) ON DELETE CASCADE,
  result           text        NOT NULL CHECK (result IN ('win', 'loss')),
  match_date       date        NOT NULL DEFAULT CURRENT_DATE,
  uploaded_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);


-- ================================================================
-- 5. squad_match_players — per-player stats in a squad match
-- ================================================================

CREATE TABLE IF NOT EXISTS public.squad_match_players (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_match_id  uuid         NOT NULL REFERENCES public.squad_matches(id) ON DELETE CASCADE,
  in_game_name    text         NOT NULL,
  user_id         uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  hero_id         uuid         REFERENCES public.heroes(id) ON DELETE SET NULL,
  kills           integer      NOT NULL DEFAULT 0,
  deaths          integer      NOT NULL DEFAULT 0,
  assists         integer      NOT NULL DEFAULT 0,
  rating          numeric(4,1),
  created_at      timestamptz  NOT NULL DEFAULT now()
);


-- ================================================================
-- 6. squad_name_mappings — in-game name → user_id per session
-- ================================================================

CREATE TABLE IF NOT EXISTS public.squad_name_mappings (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_session_id uuid  NOT NULL REFERENCES public.squad_sessions(id) ON DELETE CASCADE,
  in_game_name     text  NOT NULL,
  user_id          uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (squad_session_id, in_game_name)
);


-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_squad_members_session ON public.squad_members(squad_session_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user    ON public.squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_matches_session ON public.squad_matches(squad_session_id);
CREATE INDEX IF NOT EXISTS idx_squad_mp_match        ON public.squad_match_players(squad_match_id);
CREATE INDEX IF NOT EXISTS idx_squad_mp_user         ON public.squad_match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_mappings_session ON public.squad_name_mappings(squad_session_id);


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.squad_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_name_mappings ENABLE ROW LEVEL SECURITY;

-- squad_sessions: anyone authenticated can read, member can see theirs
DROP POLICY IF EXISTS "squad_sessions: members can read" ON public.squad_sessions;
CREATE POLICY "squad_sessions: members can read"
  ON public.squad_sessions FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "squad_sessions: authenticated can insert" ON public.squad_sessions;
CREATE POLICY "squad_sessions: authenticated can insert"
  ON public.squad_sessions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "squad_sessions: creator can update" ON public.squad_sessions;
CREATE POLICY "squad_sessions: creator can update"
  ON public.squad_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "squad_sessions: creator can delete" ON public.squad_sessions;
CREATE POLICY "squad_sessions: creator can delete"
  ON public.squad_sessions FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- squad_members
DROP POLICY IF EXISTS "squad_members: members can read" ON public.squad_members;
CREATE POLICY "squad_members: members can read"
  ON public.squad_members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_session_id = squad_session_id AND sm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.squad_sessions ss WHERE ss.id = squad_session_id AND ss.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "squad_members: authenticated can insert" ON public.squad_members;
CREATE POLICY "squad_members: authenticated can insert"
  ON public.squad_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "squad_members: user can delete own" ON public.squad_members;
CREATE POLICY "squad_members: user can delete own"
  ON public.squad_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- squad_matches
DROP POLICY IF EXISTS "squad_matches: members can read" ON public.squad_matches;
CREATE POLICY "squad_matches: members can read"
  ON public.squad_matches FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = squad_session_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.squad_sessions WHERE id = squad_session_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "squad_matches: members can insert" ON public.squad_matches;
CREATE POLICY "squad_matches: members can insert"
  ON public.squad_matches FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = squad_session_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.squad_sessions WHERE id = squad_session_id AND created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "squad_matches: uploader can delete" ON public.squad_matches;
CREATE POLICY "squad_matches: uploader can delete"
  ON public.squad_matches FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- squad_match_players
DROP POLICY IF EXISTS "squad_match_players: members can read" ON public.squad_match_players;
CREATE POLICY "squad_match_players: members can read"
  ON public.squad_match_players FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_matches sm
      JOIN public.squad_members smem ON smem.squad_session_id = sm.squad_session_id
      WHERE sm.id = squad_match_id AND smem.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squad_matches sm
      JOIN public.squad_sessions ss ON ss.id = sm.squad_session_id
      WHERE sm.id = squad_match_id AND ss.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "squad_match_players: members can insert" ON public.squad_match_players;
CREATE POLICY "squad_match_players: members can insert"
  ON public.squad_match_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squad_matches sm
      WHERE sm.id = squad_match_id AND sm.uploaded_by = auth.uid()
    )
  );

-- squad_name_mappings
DROP POLICY IF EXISTS "squad_name_mappings: members can read" ON public.squad_name_mappings;
CREATE POLICY "squad_name_mappings: members can read"
  ON public.squad_name_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = squad_session_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.squad_sessions WHERE id = squad_session_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "squad_name_mappings: members can insert" ON public.squad_name_mappings;
CREATE POLICY "squad_name_mappings: members can insert"
  ON public.squad_name_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = squad_session_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.squad_sessions WHERE id = squad_session_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "squad_name_mappings: members can update" ON public.squad_name_mappings;
CREATE POLICY "squad_name_mappings: members can update"
  ON public.squad_name_mappings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_session_id = squad_session_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.squad_sessions WHERE id = squad_session_id AND created_by = auth.uid())
  );
