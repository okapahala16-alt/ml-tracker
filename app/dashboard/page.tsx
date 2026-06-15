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
        <div className="flex items-start gap-3 px-4 py-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-xl text-sm">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <span className="font-medium">Belum ada season aktif. </span>
            {isAdmin
              ? <Link href="/seasons" className="underline underline-offset-2 hover:text-yellow-200 transition-colors">Buat atau aktifkan season →</Link>
              : <span className="text-yellow-400/80">Hubungi admin untuk membuat season.</span>
            }
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm">Selamat datang kembali</p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {displayName}
          </h1>
          {activeSeason && (
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              {activeSeason.name}
            </p>
          )}
        </div>
        <Link
          href="/match/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          Log Match
        </Link>
      </div>

      {/* ── SECTION 1: Personal stats ── */}
      <section>
        <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Statistik Kamu{activeSeason ? ` · ${activeSeason.name}` : ' · Semua Waktu'}
        </h2>

        {myTotal === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {activeSeason ? 'Belum ada match di season ini.' : 'Belum ada match.'}{' '}
              <Link href="/match/new" className="text-blue-400 hover:text-blue-300">
                Log sekarang →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Match */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Match</p>
              <p className="text-3xl font-black text-white mt-1">{myTotal}</p>
              <p className="text-xs text-slate-500 mt-1">{myWins}W · {myTotal - myWins}L</p>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Win Rate</p>
              <p className={`text-3xl font-black mt-1 ${wrColor(myWR)}`}>
                {myWR.toFixed(1)}%
              </p>
              <div className="mt-2 w-full bg-slate-700/40 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-1 rounded-full transition-all ${wrBarColor(myWR)}`}
                  style={{ width: `${Math.min(myWR, 100)}%` }}
                />
              </div>
            </div>

            {/* Best Hero */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Best Hero</p>
              {myBestHero ? (
                <>
                  <p className="text-xl font-black text-white mt-1 truncate">{myBestHero.name}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {myBestHero.role} · {myBestHero.count}x pakai
                  </p>
                </>
              ) : (
                <p className="text-2xl font-black text-slate-600 mt-1">—</p>
              )}
            </div>

            {/* Avg KDA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg KDA</p>
              <p className="text-3xl font-black text-white mt-1">{myKDA}</p>
              <p className="text-xs text-slate-500 mt-1">
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
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
            Semua Player · All Time
          </h2>
          <SortToggle current={sortParam} />
        </div>

        {playerCards.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Belum ada player terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playerCards.map(({ profile, games, wr, avgKDA, topHero }) => {
              const initial = (profile.display_name || profile.username)[0]?.toUpperCase() ?? '?'
              const isMe    = profile.id === user.id
              return (
                <Link key={profile.id} href={`/player/${profile.username}`}>
                  <div className={`relative group bg-slate-900 border rounded-2xl p-5 hover:border-slate-600 hover:-translate-y-0.5 transition-all cursor-pointer ${
                    isMe ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800'
                  }`}>
                    {isMe && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                        Kamu
                      </span>
                    )}

                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0" style={{ backgroundColor: profile.color ?? '#6366f1' }}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {profile.display_name || profile.username}
                        </p>
                        <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
                      </div>
                    </div>

                    {games > 0 ? (
                      <>
                        {/* WR badge + value */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${wrBadgeClass(wr)}`}>
                            {wrLabel(wr)}
                          </span>
                          <span className={`text-sm font-black ${wrColor(wr)}`}>
                            {wr.toFixed(0)}%
                          </span>
                        </div>

                        {/* WR bar */}
                        <div className="w-full bg-slate-700/40 rounded-full h-1 mb-4 overflow-hidden">
                          <div
                            className={`h-1 rounded-full ${wrBarColor(wr)}`}
                            style={{ width: `${Math.min(wr, 100)}%` }}
                          />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{games} game{games !== 1 ? 's' : ''}</span>
                          <span>KDA <span className="text-white font-semibold">{avgKDA}</span></span>
                        </div>

                        {/* Top hero */}
                        {topHero && (
                          <div className="mt-3 pt-3 border-t border-slate-800/60">
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">Top Hero</p>
                            <p className="text-xs font-medium text-slate-300 truncate">
                              {topHero.name}
                              <span className="ml-1.5 text-slate-600 capitalize">({topHero.role})</span>
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-600 italic">Belum ada match</p>
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
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Aktivitas Terbaru
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {recentMatches.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Belum ada match tersimpan.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentMatches.map((match) => {
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
                      className="flex items-center gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors"
                    >
                      {/* W/L badge */}
                      <span className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black border ${
                        isWin
                          ? 'bg-green-500/15 text-green-400 border-green-500/20'
                          : 'bg-red-500/15 text-red-400 border-red-500/20'
                      }`}>
                        {isWin ? 'W' : 'L'}
                      </span>

                      {/* Creator info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: creator?.color ?? '#6366f1' }}>
                          {creatorInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {creator?.username ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {dateStr} · {timeStr} · {pCount} player{pCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Season tag */}
                      {match.seasons?.name && (
                        <span className="text-[10px] text-slate-600 shrink-0 hidden sm:block">
                          {match.seasons.name}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
            {recentMatches.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-800/60">
                <Link href="/matches" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Lihat semua riwayat →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: Quick Stats */}
        <section className="lg:col-span-2">
          <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Quick Stats{activeSeason ? ` · ${activeSeason.name}` : ' · All Time'}
          </h2>
          <div className="space-y-3">

            {/* Total matches */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/15 shrink-0">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Match</p>
                <p className="text-2xl font-black text-white">{totalSeasonMatches}</p>
              </div>
            </div>

            {/* Popular hero */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/15 shrink-0">
                <Flame className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Hero Populer</p>
                <p className="text-lg font-black text-white truncate">
                  {popularHero?.name ?? '—'}
                </p>
                {popularHero && (
                  <p className="text-[10px] text-slate-500">{popularHero.count}× dipilih</p>
                )}
              </div>
            </div>

            {/* Most active player */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/15 shrink-0">
                <Trophy className="w-5 h-5 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Player Teraktif</p>
                <p className="text-lg font-black text-white truncate">
                  {mostActiveProfile?.username ?? '—'}
                </p>
                {mostActiveCount > 0 && (
                  <p className="text-[10px] text-slate-500">{mostActiveCount} match</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
