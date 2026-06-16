-- ================================================================
-- Fix: Squad join via invite link/code fails for new users
--
-- Root cause: squad_sessions SELECT policy only allows members/creators
-- to read. A new user has no membership yet, so the invite_code lookup
-- returns NULL and the join page reports "invalid code" before the
-- INSERT can happen.
--
-- Fix: Allow any authenticated user to read squad_sessions.
-- This is safe — name + invite_code are not sensitive data.
-- INSERT / UPDATE / DELETE remain restricted to creator.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ================================================================

DROP POLICY IF EXISTS "squad_sessions: members can read"        ON public.squad_sessions;
DROP POLICY IF EXISTS "squad_sessions: authenticated can read"  ON public.squad_sessions;

CREATE POLICY "squad_sessions: authenticated can read"
  ON public.squad_sessions FOR SELECT TO authenticated
  USING (true);
