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
  if (wr < 40) return {
    label: 'Feeder',  text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    bar: 'bg-red-500',
    pillBg: 'rgba(239,68,68,0.18)',   pillColor: 'var(--loss)',         pillBorder: '1px solid rgba(239,68,68,0.5)',
  }
  if (wr < 50) return {
    label: 'Average', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', bar: 'bg-yellow-500',
    pillBg: 'rgba(234,179,8,0.18)',   pillColor: '#EAB308',            pillBorder: '1px solid rgba(234,179,8,0.5)',
  }
  if (wr < 60) return {
    label: 'Good',    text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/25',  bar: 'bg-green-500',
    pillBg: 'rgba(34,197,94,0.18)',   pillColor: 'var(--win)',          pillBorder: '1px solid rgba(34,197,94,0.5)',
  }
  return {
    label: 'Carry',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   bar: 'bg-gradient-to-r from-blue-500 to-purple-500',
    pillBg: 'rgba(79,142,247,0.18)',  pillColor: 'var(--accent-blue)', pillBorder: '1px solid rgba(79,142,247,0.5)', pillShadow: '0 0 12px rgba(79,142,247,0.2)',
  }
}

const ROLE_BANNER: Record<string, { bg: string; borderColor: string; roleColor: string }> = {
  tank:     { bg: 'linear-gradient(135deg, rgba(79,142,247,0.15), rgba(79,142,247,0.05))',  borderColor: 'rgba(79,142,247,0.25)',  roleColor: 'var(--accent-blue)'   },
  fighter:  { bg: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))', borderColor: 'rgba(249,115,22,0.25)',  roleColor: '#F97316'              },
  mage:     { bg: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))', borderColor: 'rgba(124,58,237,0.25)',  roleColor: 'var(--accent-purple)' },
  marksman: { bg: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',   borderColor: 'rgba(34,197,94,0.25)',   roleColor: 'var(--win)'           },
  assassin: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',   borderColor: 'rgba(239,68,68,0.25)',   roleColor: 'var(--loss)'          },
  support:  { bg: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',   borderColor: 'rgba(255,215,0,0.25)',   roleColor: 'var(--mvp-gold)'      },
}
const DEFAULT_BANNER = {
  bg: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(124,58,237,0.1))',
  borderColor: 'rgba(79,142,247,0.2)',
  roleColor: 'var(--accent-blue)',
}

const ROLE_BADGE: Record<string, { background: string; color: string; border: string }> = {
  tank:     { background: 'rgba(79,142,247,0.15)',  color: 'var(--accent-blue)',   border: '1px solid rgba(79,142,247,0.3)'  },
  fighter:  { background: 'rgba(249,115,22,0.15)',  color: '#F97316',              border: '1px solid rgba(249,115,22,0.3)'  },
  mage:     { background: 'rgba(124,58,237,0.15)',  color: 'var(--accent-purple)', border: '1px solid rgba(124,58,237,0.3)'  },
  marksman: { background: 'rgba(34,197,94,0.15)',   color: 'var(--win)',           border: '1px solid rgba(34,197,94,0.3)'   },
  assassin: { background: 'rgba(239,68,68,0.15)',   color: 'var(--loss)',          border: '1px solid rgba(239,68,68,0.3)'   },
  support:  { background: 'rgba(255,215,0,0.15)',   color: 'var(--mvp-gold)',      border: '1px solid rgba(255,215,0,0.3)'   },
}

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_BADGE[role] ?? {
    background: 'rgba(100,116,139,0.15)',
    color:      'var(--text-secondary)',
    border:     '1px solid rgba(100,116,139,0.3)',
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={s}>
      {role}
    </span>
  )
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

  const recentRows   = rows.slice(0, 10)
  const isOwnProfile = user.id === profile.id
  const initial      = (profile.display_name || profile.username)[0]?.toUpperCase() ?? '?'
  const topHeroRole  = heroStats[0]?.role ?? ''
  const banner       = ROLE_BANNER[topHeroRole] ?? DEFAULT_BANNER

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* ── SECTION 1: Header ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: banner.bg, border: `1px solid ${banner.borderColor}` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

          {/* Avatar + names */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
              style={{
                background:  'rgba(0,0,0,0.25)',
                border:      `2px solid ${banner.borderColor}`,
                color:       banner.roleColor,
                fontFamily:  'var(--font-orbitron), Orbitron, sans-serif',
                boxShadow:   `0 0 20px ${banner.borderColor}`,
              }}
            >
              {initial}
            </div>

            <div>
              <h1
                className="text-2xl font-black tracking-wide"
                style={{
                  fontFamily:          'var(--font-orbitron), Orbitron, sans-serif',
                  background:          'linear-gradient(135deg,#4F8EF7,#7C3AED)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip:      'text',
                }}
              >
                {(profile.display_name || profile.username).toUpperCase()}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                @{profile.username}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    fontFamily: 'var(--font-rajdhani)',
                    letterSpacing: '0.06em',
                    background:   rank.pillBg,
                    color:        rank.pillColor,
                    border:       rank.pillBorder,
                    boxShadow:    (rank as { pillShadow?: string }).pillShadow,
                  }}
                >
                  {rank.label.toUpperCase()}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} match</span>
              </div>
            </div>
          </div>

          {/* Season filter + quick W/L */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <SeasonFilter seasons={seasons} selected={selected} />
            {total > 0 && (
              <div className="flex items-center gap-3 text-sm" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--win)' }}>
                  <TrendingUp className="w-3.5 h-3.5" /> {wins}W
                </span>
                <span style={{ color: 'var(--border-glow)' }}>·</span>
                <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--loss)' }}>
                  <TrendingDown className="w-3.5 h-3.5" /> {losses}L
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Stats Grid 2×3 ── */}
      {total === 0 ? (
        <div className="card rounded-2xl p-10 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Belum ada data match{selected !== 'all' ? ' untuk season ini' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Win Rate */}
          <div className={`col-span-2 lg:col-span-1 card rounded-2xl p-5 ${rank.border}`}>
            <p className="section-label mb-1">Win Rate</p>
            <p className={`text-3xl font-black tracking-tight ${rank.text}`} style={{ fontFamily: 'var(--font-orbitron)' }}>
              {winRate.toFixed(1)}%
            </p>
            <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className={`h-1.5 rounded-full transition-all ${rank.bar}`}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{wins}W · {losses}L · {total} match</p>
          </div>

          {/* KDA Ratio */}
          <div className="card rounded-2xl p-5">
            <p className="section-label mb-1">KDA Ratio</p>
            <p
              className="text-3xl font-black tracking-tight"
              style={{
                fontFamily:          'var(--font-orbitron), Orbitron, sans-serif',
                background:          'linear-gradient(135deg,#4F8EF7,#7C3AED)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip:      'text',
              }}
            >
              {kdaRatio}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>(K+A) / D</p>
          </div>

          {/* Avg Kills */}
          <div className="card rounded-2xl p-5">
            <p className="section-label mb-1">Avg Kills</p>
            <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: 'var(--accent-blue)' }}>{avg(totK, total)}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>per match</p>
          </div>

          {/* Avg Deaths */}
          <div className="card rounded-2xl p-5">
            <p className="section-label mb-1">Avg Deaths</p>
            <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: 'var(--loss)' }}>{avg(totD, total)}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>per match</p>
          </div>

          {/* Avg Assists */}
          <div className="card rounded-2xl p-5">
            <p className="section-label mb-1">Avg Assists</p>
            <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: 'var(--accent-purple)' }}>{avg(totA, total)}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>per match</p>
          </div>

          {/* Avg Rating */}
          <div className="card rounded-2xl p-5">
            <p className="section-label mb-1">Avg Rating</p>
            <p className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: 'var(--gold)' }}>{avg(totR, total)}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>/ 10.0</p>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Charts ── */}
      {total >= 3 && (
        <PlayerCharts weeklyData={weeklyData} kdaData={kdaData} />
      )}

      {/* ── SECTION 4: Hero Stats ── */}
      {heroStats.length > 0 && (
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)', fontSize: '1rem' }}>Hero Stats</h2>
            {bestHeroId && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Hero terbaik: <span style={{ color: 'var(--accent-blue)' }}>{heroStats.find(h => h.id === bestHeroId)?.name}</span>
              </p>
            )}
          </div>

          {/* Table header */}
          <div
            className="hidden sm:grid px-6 py-3"
            style={{ gridTemplateColumns: '1.8fr 70px 48px 48px 80px 90px 80px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}
          >
            {['Hero', 'Games', 'W', 'L', 'Win %', 'Avg KDA', 'Avg Rtg'].map((h) => (
              <div key={h} className="section-label first:text-left text-center">{h}</div>
            ))}
          </div>

          <div>
            {heroStats.map((hero, idx) => {
              const isBest = hero.id === bestHeroId
              return (
                <div
                  key={hero.id}
                  className="transition-colors hover:bg-[#1A1A26]"
                  style={{
                    borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                    borderLeft: isBest ? '3px solid var(--accent-blue)' : undefined,
                    background: isBest ? 'rgba(79,142,247,0.03)' : undefined,
                  }}
                >
                  {/* Mobile */}
                  <div className="flex items-center justify-between px-6 py-3.5 sm:hidden">
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{hero.name}</span>
                      {isBest && <span className="ml-2 text-[10px] font-semibold" style={{ color: 'var(--accent-blue)' }}>BEST</span>}
                      <div className="mt-1"><RoleBadge role={hero.role} /></div>
                    </div>
                    <div className="text-right text-sm">
                      <p style={{ color: 'var(--text-primary)' }}>{hero.games}G · {hero.wins}W · {hero.losses}L</p>
                      <p className={`text-xs font-semibold ${hero.winRate >= 60 ? 'text-blue-400' : hero.winRate >= 50 ? 'text-green-400' : hero.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {hero.winRate.toFixed(0)}% · KDA {hero.avgKDA}
                      </p>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div
                    className="hidden sm:grid items-center px-6 py-3.5"
                    style={{ gridTemplateColumns: '1.8fr 70px 48px 48px 80px 90px 80px' }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{hero.name}</span>
                      {isBest && (
                        <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: 'var(--accent-blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)' }}>
                          BEST
                        </span>
                      )}
                      <div className="mt-1"><RoleBadge role={hero.role} /></div>
                    </div>
                    <div className="text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{hero.games}</div>
                    <div className="text-center text-sm font-medium" style={{ color: 'var(--win)' }}>{hero.wins}</div>
                    <div className="text-center text-sm font-medium" style={{ color: 'var(--loss)' }}>{hero.losses}</div>
                    <div className={`text-center text-sm font-bold ${
                      hero.winRate >= 60 ? 'text-blue-400'
                      : hero.winRate >= 50 ? 'text-green-400'
                      : hero.winRate >= 40 ? 'text-yellow-400'
                      : 'text-red-400'
                    }`}>
                      {hero.winRate.toFixed(0)}%
                    </div>
                    <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{hero.avgKDA}</div>
                    <div className="text-center text-sm" style={{ color: 'var(--gold)' }}>{hero.avgRating}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Recent Matches ── */}
      {recentRows.length > 0 && (
        <div className="card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)', fontSize: '1rem' }}>10 Match Terakhir</h2>
            {isOwnProfile && (
              <Link href="/matches" className="text-xs transition-colors" style={{ color: 'var(--accent-blue)' }}>
                Lihat semua →
              </Link>
            )}
          </div>

          <div>
            {recentRows.map((mp, idx) => {
              const isWin    = mp.matches?.result === 'win'
              const dateStr  = mp.matches?.match_date
                ? format(new Date(mp.matches.match_date), 'dd MMM yyyy', { locale: idLocale })
                : '—'
              const matchKDA = kda(mp.kills ?? 0, mp.deaths ?? 0, mp.assists ?? 0)

              return (
                <div
                  key={mp.id}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#1A1A26] group"
                  style={{
                    borderLeft: `3px solid ${isWin ? 'var(--win)' : 'var(--loss)'}`,
                    borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  {/* Result badge */}
                  <span className={isWin ? 'win-badge shrink-0' : 'loss-badge shrink-0'}>
                    {isWin ? 'WIN' : 'LOSS'}
                  </span>

                  {/* Date */}
                  <span className="text-sm w-28 shrink-0 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>

                  {/* Hero */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {mp.heroes?.name ?? '—'}
                    </p>
                    {mp.heroes?.role && (
                      <div className="mt-0.5">
                        <RoleBadge role={mp.heroes.role} />
                      </div>
                    )}
                  </div>

                  {/* KDA */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {mp.kills}/{mp.deaths}/{mp.assists}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>KDA {matchKDA}</p>
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
                      className="shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
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
