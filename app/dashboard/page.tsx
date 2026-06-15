import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import {
  PlusCircle, Activity, Shield, Flame, Trophy, Users,
} from 'lucide-react'
import SuccessToast from '@/components/ui/SuccessToast'
import ErrorToast from '@/components/ui/ErrorToast'
import SortToggle from './SortToggle'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

// ── Types ────────────────────────────────────────────────────────────────────

type MPRow = {
  id:       string
  kills:    number | null
  deaths:   number | null
  assists:  number | null
  rating:   number | null
  user_id:  string
  matches: {
    id:         string
    match_date: string
    result:     string
    season_id:  string | null
    created_by: string
    created_at: string
  } | null
  heroes: { id: string; name: string; role: string } | null
}

type Profile = { id: string; username: string; display_name: string | null; is_admin: boolean; color: string }

type RecentRow = {
  id:         string
  match_date: string
  result:     string
  created_by: string
  created_at: string
  seasons:    { name: string } | null
  match_players: { id: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function kdaStr(k: number, d: number, a: number) {
  return d > 0 ? ((k + a) / d).toFixed(2) : (k + a).toFixed(2)
}

function wrColor(wr: number) {
  if (wr < 40) return 'text-red-400'
  if (wr < 50) return 'text-yellow-400'
  if (wr < 60) return 'text-green-400'
  return 'text-blue-400'
}

function wrBarColor(wr: number) {
  if (wr < 40) return 'bg-red-500'
  if (wr < 50) return 'bg-yellow-500'
  if (wr < 60) return 'bg-green-500'
  return 'bg-gradient-to-r from-blue-500 to-purple-500'
}

function wrLabel(wr: number) {
  if (wr < 40) return 'Feeder'
  if (wr < 50) return 'Average'
  if (wr < 60) return 'Good'
  return 'Carry'
}

function wrBadgeClass(wr: number) {
  if (wr < 40) return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (wr < 50) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  if (wr < 60) return 'text-green-400 bg-green-500/10 border-green-500/20'
  return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { success?: string; sort?: string; error?: string }
}) {
  const supabase = createClient()

  // Step 1: auth + active season in parallel
  const [{ data: { user } }, { data: activeSeason }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('seasons').select('id, name').eq('is_active', true).maybeSingle(),
  ])

  if (!user) redirect('/login')

  // Step 2: bulk parallel fetch
  const [mpResult, recentResult, profilesResult] = await Promise.all([
    // All match_players with match + hero data (for sections 1, 2, 4)
    supabase
      .from('match_players')
      .select(`
        id, kills, deaths, assists, rating, user_id,
        matches (
          id, match_date, result, season_id, created_by, created_at
        ),
        heroes ( id, name, role )
      `),

    // Last 5 matches for recent activity (section 3)
    supabase
      .from('matches')
      .select(`
        id, match_date, result, created_by, created_at,
        seasons ( name ),
        match_players ( id )
      `)
      .order('created_at', { ascending: false })
      .limit(5),

    // All profiles for player cards (max 10)
    supabase
      .from('profiles')
      .select('id, username, display_name, is_admin, color')
      .order('username')
      .limit(10),
  ])

  const allMP      = (mpResult.data ?? []) as unknown as MPRow[]
  const profileList = (profilesResult.data ?? []) as Profile[]
  const profileMap  = Object.fromEntries(profileList.map((p) => [p.id, p]))
  const recentMatches = (recentResult.data ?? []) as unknown as RecentRow[]

  const myProfile   = profileMap[user.id] ?? null
  const displayName = myProfile?.display_name || myProfile?.username || 'Player'
  const isAdmin     = myProfile?.is_admin ?? false

  // ── Section 1: Personal stats (active season) ───────────────────────────

  const myRows  = allMP.filter(
    (mp) =>
      mp.user_id === user.id &&
      (!activeSeason || mp.matches?.season_id === activeSeason.id),
  )
  const myTotal = myRows.length
  const myWins  = myRows.filter((mp) => mp.matches?.result === 'win').length
  const myWR    = myTotal > 0 ? (myWins / myTotal) * 100 : 0
  const myTotK  = myRows.reduce((s, mp) => s + (mp.kills   ?? 0), 0)
  const myTotD  = myRows.reduce((s, mp) => s + (mp.deaths  ?? 0), 0)
  const myTotA  = myRows.reduce((s, mp) => s + (mp.assists ?? 0), 0)
  const myKDA   = kdaStr(myTotK, myTotD, myTotA)

  const myHeroMap = new Map<string, { name: string; role: string; count: number }>()
  for (const mp of myRows) {
    if (!mp.heroes) continue
    const h = mp.heroes
    const e = myHeroMap.get(h.id) ?? { name: h.name, role: h.role, count: 0 }
    e.count++
    myHeroMap.set(h.id, e)
  }
  const myBestHero = Array.from(myHeroMap.values()).sort((a, b) => b.count - a.count)[0] ?? null

  // ── Section 2: All-time player cards ────────────────────────────────────

  type CardStats = {
    games: number; wins: number
    kills: number; deaths: number; assists: number
    heroCount: Map<string, { name: string; role: string; count: number }>
  }
  const cardMap = new Map<string, CardStats>()

  for (const mp of allMP) {
    const uid = mp.user_id
    if (!cardMap.has(uid)) {
      cardMap.set(uid, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, heroCount: new Map() })
    }
    const s = cardMap.get(uid)!
    s.games++
    if (mp.matches?.result === 'win') s.wins++
    s.kills   += mp.kills   ?? 0
    s.deaths  += mp.deaths  ?? 0
    s.assists += mp.assists ?? 0
    if (mp.heroes) {
      const hid = mp.heroes.id
      const he  = s.heroCount.get(hid) ?? { name: mp.heroes.name, role: mp.heroes.role, count: 0 }
      he.count++
      s.heroCount.set(hid, he)
    }
  }

  const sortParam = searchParams.sort ?? 'winrate'

  const playerCards = profileList
    .map((profile) => {
      const s      = cardMap.get(profile.id)
      const games  = s?.games ?? 0
      const wins   = s?.wins  ?? 0
      const wr     = games > 0 ? (wins / games) * 100 : 0
      const avgKDA = s ? kdaStr(s.kills, s.deaths, s.assists) : '0.00'
      const topHero = s
        ? Array.from(s.heroCount.values()).sort((a, b) => b.count - a.count)[0] ?? null
        : null
      return { profile, games, wins, wr, avgKDA, topHero }
    })
    .sort((a, b) => {
      if (sortParam === 'kda')   return parseFloat(b.avgKDA) - parseFloat(a.avgKDA)
      if (sortParam === 'games') return b.games - a.games
      return b.wr - a.wr
    })

  // ── Section 4: Quick stats (active season, or all-time if no season) ────

  const seasonRows = activeSeason
    ? allMP.filter((mp) => mp.matches?.season_id === activeSeason.id)
    : allMP

  const totalSeasonMatches = new Set(
    seasonRows.map((mp) => mp.matches?.id).filter(Boolean),
  ).size

  const popHeroMap = new Map<string, { name: string; count: number }>()
  for (const mp of seasonRows) {
    if (!mp.heroes) continue
    const h = mp.heroes
    const e = popHeroMap.get(h.id) ?? { name: h.name, count: 0 }
    e.count++
    popHeroMap.set(h.id, e)
  }
  const popularHero =
    Array.from(popHeroMap.values()).sort((a, b) => b.count - a.count)[0] ?? null

  const activityMap = new Map<string, number>()
  for (const mp of seasonRows) {
    activityMap.set(mp.user_id, (activityMap.get(mp.user_id) ?? 0) + 1)
  }
  const [mostActiveId, mostActiveCount] =
    Array.from(activityMap.entries()).sort(([, a], [, b]) => b - a)[0] ?? [null, 0]
  const mostActiveProfile = mostActiveId ? (profileMap[mostActiveId] ?? null) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-8">
      {searchParams.success === 'match_added' && (
        <SuccessToast message="Match berhasil dicatat!" />
      )}
      {searchParams.error === 'access_denied' && (
        <ErrorToast message="Akses ditolak. Halaman ini hanya untuk admin." />
      )}

      {/* No active season warning */}
      {!activeSeason && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--gold)' }}>
          <span className="text-base shrink-0">⚠️</span>
          <div style={{ fontFamily: 'var(--font-rajdhani)' }}>
            <span className="font-medium">Belum ada season aktif. </span>
            {isAdmin
              ? <Link href="/seasons" className="underline underline-offset-2 transition-colors" style={{ color: 'var(--gold)' }}>Buat atau aktifkan season →</Link>
              : <span style={{ opacity: 0.7 }}>Hubungi admin untuk membuat season.</span>
            }
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="section-label mb-1">Selamat datang kembali</p>
          <h1
            className="text-3xl font-black tracking-widest"
            style={{
              fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
              background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WELCOME BACK, {displayName.toUpperCase()}
          </h1>
          {activeSeason && (
            <p className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              {activeSeason.name}
            </p>
          )}
        </div>
        <Link
          href="/match/new"
          className="mythic-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Log Match
        </Link>
      </div>

      {/* ── SECTION 1: Personal stats ── */}
      <section>
        <h2 className="section-label mb-4">
          Statistik Kamu{activeSeason ? ` · ${activeSeason.name}` : ' · Semua Waktu'}
        </h2>

        {myTotal === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {activeSeason ? 'Belum ada match di season ini.' : 'Belum ada match.'}{' '}
              <Link href="/match/new" className="transition-colors" style={{ color: 'var(--accent-blue)' }}>
                Log sekarang →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Match */}
            <div className="card rounded-2xl p-5">
              <p className="section-label mb-1">Total Match</p>
              <p className="stat-number">{myTotal}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{myWins}W · {myTotal - myWins}L</p>
            </div>

            {/* Win Rate */}
            <div className="card rounded-2xl p-5">
              <p className="section-label mb-1">Win Rate</p>
              <p className={`text-3xl font-black mt-1 ${wrColor(myWR)}`} style={{ fontFamily: 'var(--font-orbitron)' }}>
                {myWR.toFixed(1)}%
              </p>
              <div className="mt-2 w-full rounded-full h-1 overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className={`h-1 rounded-full transition-all ${wrBarColor(myWR)}`}
                  style={{ width: `${Math.min(myWR, 100)}%` }}
                />
              </div>
            </div>

            {/* Best Hero */}
            <div className="card rounded-2xl p-5">
              <p className="section-label mb-1">Best Hero</p>
              {myBestHero ? (
                <>
                  <p className="text-xl font-black mt-1 truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-orbitron)' }}>{myBestHero.name}</p>
                  <p className="text-xs mt-1 capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {myBestHero.role} · {myBestHero.count}x pakai
                  </p>
                </>
              ) : (
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-muted)' }}>—</p>
              )}
            </div>

            {/* Avg KDA */}
            <div className="card rounded-2xl p-5">
              <p className="section-label mb-1">Avg KDA</p>
              <p className="stat-number">{myKDA}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {(myTotK / myTotal).toFixed(1)} /{' '}
                {(myTotD / myTotal).toFixed(1)} /{' '}
                {(myTotA / myTotal).toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 2: Player cards ── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="section-label">Semua Player · All Time</h2>
          <SortToggle current={sortParam} />
        </div>

        {playerCards.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Belum ada player terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playerCards.map(({ profile, games, wr, avgKDA, topHero }) => {
              const initial = (profile.display_name || profile.username)[0]?.toUpperCase() ?? '?'
              const isMe    = profile.id === user.id
              return (
                <Link key={profile.id} href={`/player/${profile.username}`}>
                  <div className={`relative group rounded-2xl p-5 transition-all cursor-pointer hover:-translate-y-0.5 ${isMe ? 'gradient-border' : 'card'}`}>
                    {isMe && (
                      <span
                        className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: 'var(--accent-blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', fontFamily: 'var(--font-rajdhani)' }}
                      >
                        Kamu
                      </span>
                    )}

                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0"
                        style={{ backgroundColor: profile.color ?? '#6366f1' }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {profile.display_name || profile.username}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>@{profile.username}</p>
                      </div>
                    </div>

                    {games > 0 ? (
                      <>
                        {/* WR badge + value */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${wrBadgeClass(wr)}`}>
                            {wrLabel(wr)}
                          </span>
                          <span className={`text-sm font-black ${wrColor(wr)}`} style={{ fontFamily: 'var(--font-orbitron)' }}>
                            {wr.toFixed(0)}%
                          </span>
                        </div>

                        {/* WR bar */}
                        <div className="w-full rounded-full h-1 mb-4 overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div
                            className={`h-1 rounded-full ${wrBarColor(wr)}`}
                            style={{ width: `${Math.min(wr, 100)}%` }}
                          />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span>{games} game{games !== 1 ? 's' : ''}</span>
                          <span>KDA <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{avgKDA}</span></span>
                        </div>

                        {/* Top hero */}
                        {topHero && (
                          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <p className="section-label mb-0.5">Top Hero</p>
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                              {topHero.name}
                              <span className="ml-1.5 capitalize" style={{ color: 'var(--text-muted)' }}>({topHero.role})</span>
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Belum ada match</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Sections 3 & 4 side by side on desktop ── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* SECTION 3: Recent Activity */}
        <section className="lg:col-span-3">
          <h2 className="section-label mb-4">Aktivitas Terbaru</h2>
          <div className="card rounded-2xl overflow-hidden">
            {recentMatches.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Belum ada match tersimpan.</p>
              </div>
            ) : (
              <div>
                {recentMatches.map((match, i) => {
                  const isWin    = match.result === 'win'
                  const creator  = profileMap[match.created_by] ?? null
                  const dateStr  = format(new Date(match.match_date), 'dd MMM', { locale: idLocale })
                  const timeStr  = format(new Date(match.created_at),  'HH:mm')
                  const pCount   = match.match_players.length
                  const creatorInitial =
                    (creator?.display_name || creator?.username || '?')[0]?.toUpperCase()

                  return (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[#1A1A26]"
                      style={{
                        borderLeft: `3px solid ${isWin ? 'var(--win)' : 'var(--loss)'}`,
                        borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                      }}
                    >
                      {/* W/L badge */}
                      <span className={isWin ? 'win-badge' : 'loss-badge'}>
                        {isWin ? 'WIN' : 'LOSS'}
                      </span>

                      {/* Creator info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: creator?.color ?? '#6366f1' }}
                        >
                          {creatorInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {creator?.username ?? 'Unknown'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {dateStr} · {timeStr} · {pCount} player{pCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Season tag */}
                      {match.seasons?.name && (
                        <span className="text-[10px] shrink-0 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                          {match.seasons.name}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
            {recentMatches.length > 0 && (
              <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <Link href="/matches" className="text-xs transition-colors" style={{ color: 'var(--accent-blue)' }}>
                  Lihat semua riwayat →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: Quick Stats */}
        <section className="lg:col-span-2">
          <h2 className="section-label mb-4">
            Quick Stats{activeSeason ? ` · ${activeSeason.name}` : ' · All Time'}
          </h2>
          <div className="space-y-3">

            {/* Total matches */}
            <div className="card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.15)' }}>
                <Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div>
                <p className="section-label">Total Match</p>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-orbitron)' }}>{totalSeasonMatches}</p>
              </div>
            </div>

            {/* Popular hero */}
            <div className="card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Flame className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
              </div>
              <div className="min-w-0">
                <p className="section-label">Hero Populer</p>
                <p className="text-lg font-black truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-orbitron)' }}>
                  {popularHero?.name ?? '—'}
                </p>
                {popularHero && (
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{popularHero.count}× dipilih</p>
                )}
              </div>
            </div>

            {/* Most active player */}
            <div className="card rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <Trophy className="w-5 h-5" style={{ color: 'var(--win)' }} />
              </div>
              <div className="min-w-0">
                <p className="section-label">Player Teraktif</p>
                <p className="text-lg font-black truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-orbitron)' }}>
                  {mostActiveProfile?.username ?? '—'}
                </p>
                {mostActiveCount > 0 && (
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{mostActiveCount} match</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
