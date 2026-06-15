import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Trophy } from 'lucide-react'
import LeaderboardTabs, {
  MIN_GAMES,
  type PlayerEntry,
  type HeroEntry,
} from './LeaderboardTabs'
import LeaderboardSeasonFilter from './LeaderboardSeasonFilter'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Leaderboard' }

// ── Type for raw Supabase rows ────────────────────────────────────────────────

type MPRow = {
  id:      string
  kills:   number | null
  deaths:  number | null
  assists: number | null
  rating:  number | null
  user_id: string
  matches: {
    id:         string
    match_date: string
    result:     string
    season_id:  string | null
    created_at: string
  } | null
  heroes: { id: string; name: string; role: string } | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { season?: string }
}) {
  const supabase = createClient()

  // Step 1: auth + seasons + profiles in parallel
  const [
    { data: { user } },
    { data: rawSeasons },
    { data: rawProfiles },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('seasons').select('id, name, is_active').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, username, display_name'),
  ])

  if (!user) redirect('/login')

  const seasons     = (rawSeasons  ?? []) as { id: string; name: string; is_active: boolean }[]
  const profiles    = (rawProfiles ?? []) as { id: string; username: string; display_name: string | null }[]
  const profileMap  = Object.fromEntries(profiles.map((p) => [p.id, p]))

  const activeSeason     = seasons.find((s) => s.is_active) ?? null
  const selectedSeasonId = searchParams.season ?? activeSeason?.id ?? 'all'

  // Step 2: fetch all match_players with match + hero data
  const { data: rawMP } = await supabase
    .from('match_players')
    .select(`
      id, kills, deaths, assists, rating, user_id,
      matches ( id, match_date, result, season_id, created_at ),
      heroes  ( id, name, role )
    `)

  const allMP = (rawMP ?? []) as unknown as MPRow[]

  // Apply season filter in JS (simpler than PostgREST filter on embedded resource)
  const filteredMP = selectedSeasonId === 'all'
    ? allMP
    : allMP.filter((mp) => mp.matches?.season_id === selectedSeasonId)

  // ── Aggregate player stats ────────────────────────────────────────────────

  type PlayerAcc = {
    games: number; wins: number
    kills: number; deaths: number; assists: number
    ratings: number[]
    heroIds: Set<string>
    topHeroCount: Map<string, number>
    topHeroName:  Map<string, string>
    matchResults: { result: string; date: string; createdAt: string }[]
  }

  const playerAcc = new Map<string, PlayerAcc>()

  for (const mp of filteredMP) {
    const uid = mp.user_id
    if (!playerAcc.has(uid)) {
      playerAcc.set(uid, {
        games: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
        ratings: [], heroIds: new Set(),
        topHeroCount: new Map(), topHeroName: new Map(),
        matchResults: [],
      })
    }
    const s = playerAcc.get(uid)!
    s.games++
    if (mp.matches?.result === 'win') s.wins++
    s.kills   += mp.kills   ?? 0
    s.deaths  += mp.deaths  ?? 0
    s.assists += mp.assists ?? 0
    if (mp.rating != null) s.ratings.push(mp.rating)
    if (mp.heroes) {
      const hid = mp.heroes.id
      s.heroIds.add(hid)
      s.topHeroCount.set(hid, (s.topHeroCount.get(hid) ?? 0) + 1)
      s.topHeroName.set(hid, mp.heroes.name)
    }
    if (mp.matches) {
      s.matchResults.push({
        result:    mp.matches.result,
        date:      mp.matches.match_date,
        createdAt: mp.matches.created_at,
      })
    }
  }

  const players: PlayerEntry[] = []

  for (const [uid, s] of Array.from(playerAcc)) {
    const profile = profileMap[uid]
    if (!profile) continue

    // Sort chronologically for streak calculation
    s.matchResults.sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      return d !== 0 ? d : a.createdAt.localeCompare(b.createdAt)
    })

    let maxWin = 0, maxLose = 0, curWin = 0, curLose = 0
    for (const { result } of s.matchResults) {
      if (result === 'win') {
        curWin++; curLose = 0
        if (curWin  > maxWin)  maxWin  = curWin
      } else {
        curLose++; curWin = 0
        if (curLose > maxLose) maxLose = curLose
      }
    }

    // Top hero: most played
    let topHeroId = '', topHeroCnt = 0
    for (const [hid, cnt] of Array.from(s.topHeroCount)) {
      if (cnt > topHeroCnt) { topHeroCnt = cnt; topHeroId = hid }
    }
    const topHero = s.topHeroName.get(topHeroId) ?? '—'

    const wr       = s.games > 0 ? (s.wins / s.games) * 100 : 0
    const kda      = s.deaths > 0 ? (s.kills + s.assists) / s.deaths : s.kills + s.assists
    const avgRating = s.ratings.length > 0
      ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length
      : 0
    const avgDeaths = s.games > 0 ? s.deaths / s.games : 0

    players.push({
      userId:        uid,
      username:      profile.username,
      displayName:   profile.display_name || profile.username,
      games:         s.games,
      wins:          s.wins,
      wr,
      kda,
      avgRating,
      avgDeaths,
      uniqueHeroes:  s.heroIds.size,
      topHero,
      maxWinStreak:  maxWin,
      maxLoseStreak: maxLose,
    })
  }

  // ── Aggregate hero stats ──────────────────────────────────────────────────

  type HeroAcc = {
    name: string; role: string
    games: number; wins: number
    kills: number; deaths: number; assists: number
    ratings: number[]
    userGames: Map<string, number>
  }

  const heroAcc = new Map<string, HeroAcc>()

  for (const mp of filteredMP) {
    if (!mp.heroes) continue
    const hid = mp.heroes.id
    if (!heroAcc.has(hid)) {
      heroAcc.set(hid, {
        name: mp.heroes.name, role: mp.heroes.role,
        games: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
        ratings: [], userGames: new Map(),
      })
    }
    const h = heroAcc.get(hid)!
    h.games++
    if (mp.matches?.result === 'win') h.wins++
    h.kills   += mp.kills   ?? 0
    h.deaths  += mp.deaths  ?? 0
    h.assists += mp.assists ?? 0
    if (mp.rating != null) h.ratings.push(mp.rating)
    h.userGames.set(mp.user_id, (h.userGames.get(mp.user_id) ?? 0) + 1)
  }

  const heroes: HeroEntry[] = Array.from(heroAcc.entries())
    .map(([id, h]) => {
      const wr       = h.games > 0 ? (h.wins / h.games) * 100 : 0
      const kda      = h.deaths > 0 ? (h.kills + h.assists) / h.deaths : h.kills + h.assists
      const avgRating = h.ratings.length > 0
        ? h.ratings.reduce((a, b) => a + b, 0) / h.ratings.length
        : 0

      let mostUsedUid = '', mostUsedCnt = 0
      for (const [uid, cnt] of Array.from(h.userGames)) {
        if (cnt > mostUsedCnt) { mostUsedCnt = cnt; mostUsedUid = uid }
      }
      const mostUsedBy = mostUsedUid ? (profileMap[mostUsedUid]?.username ?? '—') : '—'

      return {
        id, name: h.name, role: h.role,
        games: h.games, wins: h.wins,
        wr, kda, avgRating, mostUsedBy,
      }
    })
    .sort((a, b) => b.games - a.games)

  const qualifiedCount = players.filter((p) => p.games >= MIN_GAMES).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="section-label mb-1">Hall of Fame</p>
          <h1
            className="text-3xl font-black tracking-widest"
            style={{
              fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
              background: 'linear-gradient(135deg,#FFD700,#F59E0B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            LEADERBOARD
          </h1>
          <p className="text-sm mt-1.5" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            {qualifiedCount} player terkualifikasi
            {selectedSeasonId !== 'all' && activeSeason
              ? ` · ${seasons.find((s) => s.id === selectedSeasonId)?.name ?? ''}`
              : ' · Semua Season'}
            {' '}· min {MIN_GAMES} games
          </p>
        </div>
        <LeaderboardSeasonFilter seasons={seasons} selected={selectedSeasonId} />
      </div>

      <LeaderboardTabs players={players} heroes={heroes} />
    </div>
  )
}
