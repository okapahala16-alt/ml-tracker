import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { PlusCircle, TrendingUp, TrendingDown, Users, Trophy, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Riwayat Match' }

export default async function MatchesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch matches with season name and player IDs (for count)
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id, match_date, result, created_at, created_by,
      seasons ( name ),
      match_players ( id )
    `)
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  // Separate query for creator profiles (matches.created_by → profiles.id via auth.users)
  const creatorIds = Array.from(
    new Set((rawMatches ?? []).map((m) => m.created_by as string).filter(Boolean)),
  )

  const { data: creatorProfiles } = creatorIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', creatorIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (creatorProfiles ?? []).map((p) => [p.id, p]),
  )

  type Match = {
    id: string
    match_date: string
    result: string
    created_at: string
    created_by: string
    seasonName: string | null
    playerCount: number
    creator: { username: string; display_name: string | null } | null
  }

  const matches: Match[] = (rawMatches ?? []).map((m) => ({
    id:          m.id,
    match_date:  m.match_date,
    result:      m.result,
    created_at:  m.created_at,
    created_by:  m.created_by,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seasonName:  (m.seasons as any)?.name ?? null,
    playerCount: Array.isArray(m.match_players) ? m.match_players.length : 0,
    creator:     profileMap[m.created_by] ?? null,
  }))

  const wins     = matches.filter((m) => m.result === 'win').length
  const losses   = matches.filter((m) => m.result === 'loss').length
  const winRate  = matches.length ? Math.round((wins / matches.length) * 100) : 0

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-slate-400" />
            <h1 className="text-2xl font-bold text-white">Riwayat Match</h1>
          </div>
          <p className="text-slate-400 text-sm">{matches.length} match tersimpan</p>
        </div>
        <Link
          href="/match/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          Input Match Baru
        </Link>
      </div>

      {/* Quick stats */}
      {matches.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{wins}</p>
            <p className="text-xs text-slate-400 mt-0.5">Menang</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{losses}</p>
            <p className="text-xs text-slate-400 mt-0.5">Kalah</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Win Rate</p>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="p-4 rounded-full bg-slate-800">
              <Trophy className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-300">Belum ada match</p>
              <p className="text-slate-500 text-sm mt-1">Mulai catat match pertamamu sekarang</p>
            </div>
            <Link
              href="/match/new"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Input Match Pertama
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">

            {/* Table header — desktop */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_110px_64px_1.5fr_160px] gap-4 px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/30">
              <div>Tanggal</div>
              <div>Hasil</div>
              <div className="text-center">Players</div>
              <div>Season</div>
              <div>Dicatat Oleh</div>
            </div>

            {matches.map((match) => {
              const isWin    = match.result === 'win'
              const dateStr  = format(new Date(match.match_date), 'dd MMM yyyy', { locale: idLocale })
              const timeStr  = format(new Date(match.created_at),  'HH:mm')
              const initial  = (match.creator?.display_name || match.creator?.username || '?')[0]?.toUpperCase()

              return (
                <Link
                  key={match.id}
                  href={`/match/${match.id}`}
                  className="block px-5 sm:px-6 py-4 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Mobile layout */}
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div>
                      <p className="text-sm font-semibold text-white">{dateStr}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{match.seasonName ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isWin
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {isWin
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {isWin ? 'MENANG' : 'KALAH'}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {match.playerCount} players · {match.creator?.username ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:grid sm:grid-cols-[2fr_110px_64px_1.5fr_160px] sm:items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{dateStr}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Dicatat pukul {timeStr}</p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isWin
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {isWin
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {isWin ? 'MENANG' : 'KALAH'}
                      </span>
                    </div>

                    <div className="text-center text-sm text-slate-300 font-medium">
                      {match.playerCount}
                    </div>

                    <div className="text-sm text-slate-400 truncate">
                      {match.seasonName ?? <span className="text-slate-600 italic">—</span>}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {initial}
                      </div>
                      <span className="text-sm text-slate-400 truncate">
                        {match.creator?.username ?? 'Unknown'}
                      </span>
                    </div>
                  </div>
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
