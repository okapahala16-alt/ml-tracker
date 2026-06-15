import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format, startOfWeek } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import SeasonFilter from './SeasonFilter'
import PlayerCharts, { type WeeklyPoint, type KdaPoint } from './PlayerCharts'

// ── Types ─────────────────────────────────────────────────────

type MPRow = {
  id:         string
  kills:      number
  deaths:     number
  assists:    number
  rating:     number | null
  created_at: string
  matches: {
    id:        string
    match_date: string
    result:    string
    season_id: string | null
    seasons:   { id: string; name: string } | null
  } | null
  heroes: { id: string; name: string; role: string } | null
}

// ── Helpers ───────────────────────────────────────────────────

function getRank(wr: number) {
  if (wr < 40) return { label: 'Feeder',  text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    bar: 'bg-red-500'    }
  if (wr < 50) return { label: 'Average', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', bar: 'bg-yellow-500' }
  if (wr < 60) return { label: 'Good',    text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/25',  bar: 'bg-green-500'  }
  return               { label: 'Carry',  text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   bar: 'bg-gradient-to-r from-blue-500 to-purple-500' }
}

const ROLE_COLOR: Record<string, string> = {
  tank:     'text-blue-400',
  fighter:  'text-orange-400',
  mage:     'text-purple-400',
  marksman: 'text-yellow-400',
  assassin: 'text-red-400',
  support:  'text-green-400',
}

function kda(kills: number, deaths: number, assists: number) {
  return deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : `${kills + assists}.00`
}

function avg(total: number, count: number) {
  return count > 0 ? (total / count).toFixed(1) : '0.0'
}

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { username: string }
}): Promise<Metadata> {
  return { title: `@${decodeURIComponent(params.username)}` }
}

// ── Page ──────────────────────────────────────────────────────

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { season?: string }
}) {
  const username = decodeURIComponent(params.username)
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile fetch first (need id for next query)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Parallel: seasons list + all match data
  const [{ data: rawSeasons }, { data: rawMatches }] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, name, is_active')
      .order('created_at', { ascending: false }),
    supabase
      .from('match_players')
      .select(`
        id, kills, deaths, assists, rating, created_at,
        matches (
          id, match_date, result, season_id,
          seasons ( id, name )
        ),
        heroes ( id, name, role )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  const seasons   = (rawSeasons ?? []) as { id: string; name: string; is_active: boolean }[]
  const allRows   = (rawMatches ?? []) as unknown as MPRow[]
  const selected  = searchParams.season ?? 'all'

  // Apply season filter
  const rows = selected === 'all'
    ? allRows
    : allRows.filter((mp) => mp.matches?.season_id === selected)

  // ── Aggregate stats ────────────────────────────────────────
  const total   = rows.length
  const wins    = rows.filter((mp) => mp.matches?.result === 'win').length
  const losses  = total - wins
  const winRate = total > 0 ? (wins / total) * 100 : 0
  const rank    = getRank(winRate)

  const totK = rows.reduce((s, mp) => s + (mp.kills   ?? 0), 0)
  const totD = rows.reduce((s, mp) => s + (mp.deaths  ?? 0), 0)
  const totA = rows.reduce((s, mp) => s + (mp.assists ?? 0), 0)
  const totR = rows.reduce((s, mp) => s + (mp.rating  ?? 0), 0)

  const kdaRatio = totD > 0 ? ((totK + totA) / totD).toFixed(2) : `${totK + totA}.00`

  // ── Hero stats ─────────────────────────────────────────────
  const heroMap = new Map<string, {
    name: string; role: string
    games: number; wins: number
    kills: number; deaths: number; assists: number; rating: number
  }>()

  for (const mp of rows) {
    if (!mp.heroes) continue
    const hid = mp.heroes.id
    if (!heroMap.has(hid)) {
      heroMap.set(hid, { name: mp.heroes.name, role: mp.heroes.role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, rating: 0 })
    }
    const h = heroMap.get(hid)!
    h.games++
    if (mp.matches?.result === 'win') h.wins++
    h.kills   += mp.kills   ?? 0
    h.deaths  += mp.deaths  ?? 0
    h.assists += mp.assists ?? 0
    h.rating  += mp.rating  ?? 0
  }

  const heroStats = Array.from(heroMap.entries())
    .map(([id, h]) => ({
      id,
      name:      h.name,
      role:      h.role,
      games:     h.games,
      wins:      h.wins,
      losses:    h.games - h.wins,
      winRate:   h.games > 0 ? (h.wins / h.games) * 100 : 0,
      avgKDA:    kda(h.kills, h.deaths, h.assists),
      avgRating: avg(h.rating, h.games),
    }))
    .sort((a, b) => b.games - a.games)

  const bestHeroId = heroStats.filter((h) => h.games >= 3)
    .sort((a, b) => b.winRate - a.winRate)[0]?.id

  // ── Chart data ─────────────────────────────────────────────

  // Weekly win rate — last 8 weeks with data
  const weekMap = new Map<string, { date: Date; wins: number; total: number }>()
  for (const mp of rows) {
    if (!mp.matches?.match_date) continue
    const d    = new Date(mp.matches.match_date)
    const wk   = startOfWeek(d, { weekStartsOn: 1 })
    const key  = wk.toISOString()
    if (!weekMap.has(key)) weekMap.set(key, { date: wk, wins: 0, total: 0 })
    const w = weekMap.get(key)!
    w.total++
    if (mp.matches.result === 'win') w.wins++
  }

  const weeklyData: WeeklyPoint[] = Array.from(weekMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-8)
    .map((w) => ({
      week:    format(w.date, 'dd/MM', { locale: idLocale }),
      winRate: w.total > 0 ? Math.round((w.wins / w.total) * 100) : 0,
      total:   w.total,
    }))

  // KDA for last 5 matches (oldest → newest for left-to-right chart)
  const kdaData: KdaPoint[] = [...rows.slice(0, 5)]
    .reverse()
    .map((mp, i) => ({
      label:   mp.matches?.match_date
        ? format(new Date(mp.matches.match_date), 'dd/MM')
        : `M${i + 1}`,
      kills:   mp.kills   ?? 0,
      deaths:  mp.deaths  ?? 0,
      assists: mp.assists ?? 0,
    }))

  const recentRows  = rows.slice(0, 10)
  const isOwnProfile = user.id === profile.id
  const initial      = (profile.display_name || profile.username)[0]?.toUpperCase() ?? '?'

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* ── SECTION 1: Header ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

          {/* Avatar + names */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                {initial}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-slate-400 text-sm">@{profile.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${rank.bg} ${rank.text} ${rank.border}`}>
                  {rank.label}
                </span>
                <span className="text-slate-500 text-xs">{total} match</span>
              </div>
            </div>
          </div>

          {/* Season filter + quick W/L */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <SeasonFilter seasons={seasons} selected={selected} />
            {total > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" /> {wins}W
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" /> {losses}L
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Stats Grid 2×3 ── */}
      {total === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-slate-400">Belum ada data match{selected !== 'all' ? ' untuk season ini' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Win Rate — with progress bar */}
          <div className={`col-span-2 lg:col-span-1 bg-slate-900 border rounded-2xl p-5 ${rank.border}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Win Rate</p>
            <p className={`text-3xl font-black mt-1 tracking-tight ${rank.text}`}>
              {winRate.toFixed(1)}%
            </p>
            <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${rank.bar}`}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{wins}W · {losses}L · {total} match</p>
          </div>

          {/* KDA Ratio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">KDA Ratio</p>
            <p className="text-3xl font-black text-white mt-1 tracking-tight">{kdaRatio}</p>
            <p className="text-xs text-slate-500 mt-2">(K+A) / D</p>
          </div>

          {/* Avg Kills */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Kills</p>
            <p className="text-3xl font-black text-blue-400 mt-1 tracking-tight">{avg(totK, total)}</p>
            <p className="text-xs text-slate-500 mt-2">per match</p>
          </div>

          {/* Avg Deaths */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Deaths</p>
            <p className="text-3xl font-black text-red-400 mt-1 tracking-tight">{avg(totD, total)}</p>
            <p className="text-xs text-slate-500 mt-2">per match</p>
          </div>

          {/* Avg Assists */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Assists</p>
            <p className="text-3xl font-black text-purple-400 mt-1 tracking-tight">{avg(totA, total)}</p>
            <p className="text-xs text-slate-500 mt-2">per match</p>
          </div>

          {/* Avg Rating */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Rating</p>
            <p className="text-3xl font-black text-yellow-400 mt-1 tracking-tight">{avg(totR, total)}</p>
            <p className="text-xs text-slate-500 mt-2">/ 10.0</p>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Charts ── */}
      {total >= 3 && (
        <PlayerCharts weeklyData={weeklyData} kdaData={kdaData} />
      )}

      {/* ── SECTION 4: Hero Stats ── */}
      {heroStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Hero Stats</h2>
            {bestHeroId && (
              <p className="text-xs text-slate-500 mt-0.5">
                Hero terbaik: <span className="text-blue-400">{heroStats.find(h => h.id === bestHeroId)?.name}</span>
              </p>
            )}
          </div>

          {/* Table header */}
          <div className="hidden sm:grid px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/30"
            style={{ gridTemplateColumns: '1.8fr 70px 48px 48px 80px 90px 80px' }}>
            {['Hero', 'Games', 'W', 'L', 'Win %', 'Avg KDA', 'Avg Rtg'].map((h) => (
              <div key={h} className="first:text-left text-center">{h}</div>
            ))}
          </div>

          <div className="divide-y divide-slate-800/50">
            {heroStats.map((hero) => {
              const isBest = hero.id === bestHeroId
              return (
                <div
                  key={hero.id}
                  className={`px-6 py-3.5 transition-colors hover:bg-slate-800/30 ${
                    isBest ? 'bg-blue-500/5 border-l-2 border-blue-500/50' : ''
                  }`}
                >
                  {/* Mobile */}
                  <div className="flex items-center justify-between sm:hidden">
                    <div>
                      <span className="text-sm font-medium text-white">{hero.name}</span>
                      {isBest && <span className="ml-2 text-[10px] text-blue-400 font-semibold">BEST</span>}
                      <p className={`text-xs capitalize mt-0.5 ${ROLE_COLOR[hero.role] ?? 'text-slate-400'}`}>{hero.role}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">{hero.games}G · {hero.wins}W · {hero.losses}L</p>
                      <p className={`text-xs font-semibold ${hero.winRate >= 60 ? 'text-blue-400' : hero.winRate >= 50 ? 'text-green-400' : hero.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {hero.winRate.toFixed(0)}% · KDA {hero.avgKDA}
                      </p>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns: '1.8fr 70px 48px 48px 80px 90px 80px' }}>
                    <div>
                      <span className="text-sm font-medium text-white">{hero.name}</span>
                      {isBest && (
                        <span className="ml-2 text-[9px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                          BEST
                        </span>
                      )}
                      <p className={`text-xs capitalize mt-0.5 ${ROLE_COLOR[hero.role] ?? 'text-slate-400'}`}>{hero.role}</p>
                    </div>
                    <div className="text-center text-sm text-slate-300 font-medium">{hero.games}</div>
                    <div className="text-center text-sm text-green-400 font-medium">{hero.wins}</div>
                    <div className="text-center text-sm text-red-400 font-medium">{hero.losses}</div>
                    <div className={`text-center text-sm font-bold ${
                      hero.winRate >= 60 ? 'text-blue-400'
                      : hero.winRate >= 50 ? 'text-green-400'
                      : hero.winRate >= 40 ? 'text-yellow-400'
                      : 'text-red-400'
                    }`}>
                      {hero.winRate.toFixed(0)}%
                    </div>
                    <div className="text-center text-sm text-slate-300">{hero.avgKDA}</div>
                    <div className="text-center text-sm text-yellow-400">{hero.avgRating}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Recent Matches ── */}
      {recentRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">10 Match Terakhir</h2>
            {isOwnProfile && (
              <Link
                href="/matches"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Lihat semua →
              </Link>
            )}
          </div>

          <div className="divide-y divide-slate-800/50">
            {recentRows.map((mp) => {
              const isWin    = mp.matches?.result === 'win'
              const dateStr  = mp.matches?.match_date
                ? format(new Date(mp.matches.match_date), 'dd MMM yyyy', { locale: idLocale })
                : '—'
              const matchKDA = kda(mp.kills ?? 0, mp.deaths ?? 0, mp.assists ?? 0)

              return (
                <div key={mp.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-800/30 transition-colors group">

                  {/* Result badge */}
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                    isWin
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  }`}>
                    {isWin ? 'W' : 'L'}
                  </span>

                  {/* Date */}
                  <span className="text-sm text-slate-400 w-28 shrink-0 hidden sm:block">{dateStr}</span>

                  {/* Hero */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {mp.heroes?.name ?? '—'}
                    </p>
                    {mp.heroes?.role && (
                      <p className={`text-xs capitalize ${ROLE_COLOR[mp.heroes.role] ?? 'text-slate-500'}`}>
                        {mp.heroes.role}
                      </p>
                    )}
                  </div>

                  {/* KDA */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-white">
                      {mp.kills}/{mp.deaths}/{mp.assists}
                    </p>
                    <p className="text-xs text-slate-500">KDA {matchKDA}</p>
                  </div>

                  {/* Rating */}
                  <div className="w-12 text-right shrink-0">
                    <span className={`text-sm font-bold ${
                      (mp.rating ?? 0) >= 8 ? 'text-green-400'
                      : (mp.rating ?? 0) >= 6 ? 'text-yellow-400'
                      : 'text-red-400'
                    }`}>
                      {mp.rating?.toFixed(1) ?? '—'}
                    </span>
                  </div>

                  {/* Match detail link */}
                  {mp.matches?.id && (
                    <Link
                      href={`/match/${mp.matches.id}`}
                      className="shrink-0 text-slate-700 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Detail match"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
