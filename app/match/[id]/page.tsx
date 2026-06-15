import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, TrendingUp, TrendingDown, Calendar, Users, Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import DeleteMatchButton from './DeleteMatchButton'

export const metadata: Metadata = { title: 'Detail Match' }

const ROLE_COLOR: Record<string, string> = {
  tank:     'text-blue-400',
  fighter:  'text-orange-400',
  mage:     'text-purple-400',
  marksman: 'text-yellow-400',
  assassin: 'text-red-400',
  support:  'text-green-400',
}

type MatchPlayer = {
  id:      string
  user_id: string
  kills:   number
  deaths:  number
  assists: number
  rating:  number | null
  heroes:  { name: string; role: string } | null
}

export default async function MatchDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch match with season and player stats
  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, match_date, result, created_at, created_by,
      seasons ( name ),
      match_players (
        id, user_id, kills, deaths, assists, rating,
        heroes ( name, role )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!match) notFound()

  const players = (match.match_players as unknown as MatchPlayer[])

  // Fetch profiles for all players (indirect join via auth.users)
  const userIds = players.map((mp) => mp.user_id).filter(Boolean)

  const { data: rawProfiles } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (rawProfiles ?? []).map((p) => [p.id, p]),
  )

  const isWin   = match.result === 'win'
  const dateStr = format(
    new Date((match as unknown as { match_date: string }).match_date),
    'EEEE, dd MMMM yyyy',
    { locale: idLocale },
  )
  const seasonName = (match.seasons as unknown as { name: string } | null)?.name

  // Sort players by KDA desc
  const sorted = [...players].sort((a, b) => {
    const kdaA = a.deaths > 0 ? (a.kills + a.assists) / a.deaths : a.kills + a.assists
    const kdaB = b.deaths > 0 ? (b.kills + b.assists) / b.deaths : b.kills + b.assists
    return kdaB - kdaA
  })

  // Team totals
  const teamK = players.reduce((s, p) => s + (p.kills   ?? 0), 0)
  const teamD = players.reduce((s, p) => s + (p.deaths  ?? 0), 0)
  const teamA = players.reduce((s, p) => s + (p.assists ?? 0), 0)

  function kdaStr(kills: number, deaths: number, assists: number) {
    return deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : `${kills + assists}.00`
  }

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">

      {/* Back + Delete */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Riwayat Match
        </Link>
        {(match as unknown as { created_by: string }).created_by === user.id && (
          <DeleteMatchButton matchId={match.id} />
        )}
      </div>

      {/* ── Match Header ── */}
      <div className={`bg-slate-900 border rounded-2xl p-6 mb-6 ${
        isWin ? 'border-green-500/20' : 'border-red-500/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

          {/* Result */}
          <div>
            <div className={`flex items-center gap-2 text-2xl font-black ${
              isWin ? 'text-green-400' : 'text-red-400'
            }`}>
              {isWin
                ? <TrendingUp className="w-7 h-7" />
                : <TrendingDown className="w-7 h-7" />}
              {isWin ? 'MENANG' : 'KALAH'}
            </div>
            <p className="flex items-center gap-1.5 text-slate-400 text-sm mt-2">
              <Calendar className="w-3.5 h-3.5" />
              {dateStr}
            </p>
          </div>

          {/* Meta */}
          <div className="flex flex-col sm:items-end gap-2">
            {seasonName && (
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm text-slate-300">{seasonName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm text-slate-400">{players.length} players</span>
            </div>
            {/* Team total KDA */}
            <div className="text-xs text-slate-500">
              Team KDA: <span className="text-slate-300 font-medium">{teamK}/{teamD}/{teamA}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Player Stats Table ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Player Stats</h2>
          <p className="text-xs text-slate-500 mt-0.5">Diurutkan berdasarkan KDA tertinggi</p>
        </div>

        {/* Desktop header */}
        <div
          className="hidden sm:grid px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/30"
          style={{ gridTemplateColumns: '1.8fr 1.4fr 56px 56px 56px 80px 72px' }}
        >
          {['Player', 'Hero', 'K', 'D', 'A', 'KDA', 'Rating'].map((h) => (
            <div key={h} className="first:text-left text-center">{h}</div>
          ))}
        </div>

        <div className="divide-y divide-slate-800/50">
          {sorted.map((mp, idx) => {
            const profile  = profileMap[mp.user_id]
            const matchKDA = kdaStr(mp.kills ?? 0, mp.deaths ?? 0, mp.assists ?? 0)
            const initial  = (profile?.display_name || profile?.username || '?')[0]?.toUpperCase()
            const ratingNum = mp.rating ?? 0

            return (
              <div key={mp.id} className={`px-5 sm:px-6 py-4 hover:bg-slate-800/20 transition-colors ${idx === 0 ? 'bg-yellow-500/3' : ''}`}>

                {/* Mobile */}
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {profile?.display_name || profile?.username || 'Unknown'}
                    </p>
                    <p className={`text-xs capitalize ${ROLE_COLOR[mp.heroes?.role ?? ''] ?? 'text-slate-400'}`}>
                      {mp.heroes?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {mp.kills}/{mp.deaths}/{mp.assists}
                    </p>
                    <p className="text-xs text-slate-500">
                      KDA {matchKDA} · {ratingNum > 0 ? ratingNum.toFixed(1) : '—'}
                    </p>
                  </div>
                </div>

                {/* Desktop */}
                <div
                  className="hidden sm:grid items-center gap-3"
                  style={{ gridTemplateColumns: '1.8fr 1.4fr 56px 56px 56px 80px 72px' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/player/${profile?.username ?? ''}`}
                        className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate block"
                      >
                        {profile?.display_name || profile?.username || 'Unknown'}
                      </Link>
                      {profile?.username && (
                        <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{mp.heroes?.name ?? '—'}</p>
                    <p className={`text-xs capitalize ${ROLE_COLOR[mp.heroes?.role ?? ''] ?? 'text-slate-500'}`}>
                      {mp.heroes?.role ?? '—'}
                    </p>
                  </div>

                  <div className="text-center text-sm font-semibold text-blue-400">{mp.kills ?? 0}</div>
                  <div className="text-center text-sm font-semibold text-red-400">{mp.deaths ?? 0}</div>
                  <div className="text-center text-sm font-semibold text-purple-400">{mp.assists ?? 0}</div>

                  <div className="text-center text-sm font-bold text-white">{matchKDA}</div>

                  <div className="text-center">
                    <span className={`text-sm font-bold ${
                      ratingNum >= 8 ? 'text-green-400'
                      : ratingNum >= 6 ? 'text-yellow-400'
                      : ratingNum > 0 ? 'text-red-400'
                      : 'text-slate-500'
                    }`}>
                      {ratingNum > 0 ? ratingNum.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Team average footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/20">
          <div
            className="hidden sm:grid text-xs text-slate-500"
            style={{ gridTemplateColumns: '1.8fr 1.4fr 56px 56px 56px 80px 72px' }}
          >
            <div className="font-semibold text-slate-400">Team Total</div>
            <div />
            <div className="text-center font-semibold text-blue-400">{teamK}</div>
            <div className="text-center font-semibold text-red-400">{teamD}</div>
            <div className="text-center font-semibold text-purple-400">{teamA}</div>
            <div className="text-center font-semibold text-white">
              {kdaStr(teamK, teamD, teamA)}
            </div>
            <div />
          </div>
          <p className="sm:hidden text-xs text-slate-500">
            Team Total — {teamK}K/{teamD}D/{teamA}A (KDA {kdaStr(teamK, teamD, teamA)})
          </p>
        </div>
      </div>
    </div>
  )
}
