import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stats Anggota' }

export default async function MemberStatsPage({
  params,
}: {
  params: { id: string; userId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('squad_sessions')
    .select('id, name, created_by')
    .eq('id', params.id)
    .single()
  if (!session) notFound()

  // Fetch target member profile
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('username, display_name, color')
    .eq('id', params.userId)
    .single()
  if (!memberProfile) notFound()

  // Fetch all members
  const { data: members } = await supabase
    .from('squad_members')
    .select('user_id, profiles(display_name, username, color)')
    .eq('squad_session_id', params.id)

  const memberList = (members ?? []).map((m) => ({
    user_id: m.user_id,
    ...(m.profiles as unknown as { display_name: string | null; username: string; color: string }),
  }))

  // Fetch all matches + players
  const { data: matches } = await supabase
    .from('squad_matches')
    .select('id, result, match_date, squad_match_players(user_id, kills, deaths, assists, rating, heroes(name, role))')
    .eq('squad_session_id', params.id)
    .order('created_at', { ascending: false })

  type MatchRow = {
    id: string
    result: 'win' | 'loss'
    match_date: string
    squad_match_players: Array<{
      user_id: string | null
      kills: number
      deaths: number
      assists: number
      rating: number | null
      heroes: { name: string; role: string } | null
    }>
  }

  const matchList = (matches ?? []) as unknown as MatchRow[]

  // Only matches where this member participated
  const myMatches = matchList.filter((m) =>
    m.squad_match_players.some((p) => p.user_id === params.userId)
  )

  const totalMatches = myMatches.length
  const totalWins    = myMatches.filter((m) => m.result === 'win').length
  const totalLosses  = totalMatches - totalWins
  const winrate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0

  // Aggregate KDA + rating
  let totalK = 0, totalD = 0, totalA = 0, ratingSum = 0, ratingCount = 0
  const heroCount: Record<string, number> = {}

  myMatches.forEach((m) => {
    const p = m.squad_match_players.find((pl) => pl.user_id === params.userId)
    if (!p) return
    totalK += p.kills; totalD += p.deaths; totalA += p.assists
    if (p.rating != null) { ratingSum += p.rating; ratingCount++ }
    if (p.heroes?.name) heroCount[p.heroes.name] = (heroCount[p.heroes.name] ?? 0) + 1
  })

  const avgKDA = totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : `${totalK + totalA}.00`
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '—'
  const mostPlayedHero = Object.entries(heroCount).sort((a, b) => b[1] - a[1])[0]

  // Pairwise winrate with each other member
  const pairStats: Record<string, { wins: number; total: number }> = {}
  memberList.filter((m) => m.user_id !== params.userId).forEach((m) => {
    pairStats[m.user_id] = { wins: 0, total: 0 }
  })

  myMatches.forEach((m) => {
    const partners = m.squad_match_players
      .filter((p) => p.user_id && p.user_id !== params.userId && pairStats[p.user_id])
      .map((p) => p.user_id as string)

    partners.forEach((partnerId) => {
      pairStats[partnerId].total++
      if (m.result === 'win') pairStats[partnerId].wins++
    })
  })

  const pairList = Object.entries(pairStats)
    .filter(([, s]) => s.total > 0)
    .map(([uid, s]) => ({
      member: memberList.find((m) => m.user_id === uid)!,
      wr: Math.round((s.wins / s.total) * 100),
      wins: s.wins,
      total: s.total,
    }))
    .sort((a, b) => b.wr - a.wr)

  const bestPartner  = pairList[0]
  const worstPartner = pairList[pairList.length - 1]

  // Recent 10 matches form
  const recentForm = myMatches.slice(0, 10).map((m) => m.result)

  const name = memberProfile.display_name || memberProfile.username

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      <Link
        href={`/squad/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> {session.name}
      </Link>

      {/* Profile header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-5 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style={{ backgroundColor: memberProfile.color ?? '#6366f1' }}
        >
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{name}</h1>
          <p className="text-slate-400 text-sm">@{memberProfile.username} · {totalMatches} match</p>
          {mostPlayedHero && (
            <p className="text-xs text-slate-500 mt-1">Hero favorit: <span className="text-slate-300">{mostPlayedHero[0]}</span> ({mostPlayedHero[1]}x)</p>
          )}
        </div>
      </div>

      {totalMatches === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-sm">
          Belum ada data match untuk anggota ini.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4">Statistik Keseluruhan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className={`text-2xl font-black ${winrate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{winrate}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Winrate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{totalWins}W/{totalLosses}L</p>
                <p className="text-xs text-slate-500 mt-0.5">Record</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{avgKDA}</p>
                <p className="text-xs text-slate-500 mt-0.5">Avg KDA</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{avgRating}</p>
                <p className="text-xs text-slate-500 mt-0.5">Avg Rating</p>
              </div>
            </div>
          </div>

          {/* Recent form */}
          {recentForm.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="font-semibold text-white mb-3">Performa Terbaru</h2>
              <div className="flex gap-1.5 flex-wrap">
                {recentForm.map((r, i) => (
                  <span
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      r === 'win' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {r === 'win' ? 'W' : 'L'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Partner winrate */}
          {pairList.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="font-semibold text-white">Winrate Bermain Bareng</h2>
              </div>

              {bestPartner && bestPartner !== worstPartner && (
                <div className="px-5 py-3 border-b border-slate-800 bg-green-500/5">
                  <p className="text-xs text-slate-500 mb-1">Best Partner</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: bestPartner.member.color ?? '#6366f1' }}>
                      {(bestPartner.member.display_name || bestPartner.member.username)[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white flex-1">{bestPartner.member.display_name || bestPartner.member.username}</span>
                    <span className="text-green-400 font-bold text-sm">{bestPartner.wr}%</span>
                    <span className="text-xs text-slate-600">({bestPartner.wins}W/{bestPartner.total - bestPartner.wins}L)</span>
                  </div>
                </div>
              )}

              {worstPartner && bestPartner !== worstPartner && (
                <div className="px-5 py-3 border-b border-slate-800 bg-red-500/5">
                  <p className="text-xs text-slate-500 mb-1">Worst Partner</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: worstPartner.member.color ?? '#6366f1' }}>
                      {(worstPartner.member.display_name || worstPartner.member.username)[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white flex-1">{worstPartner.member.display_name || worstPartner.member.username}</span>
                    <span className="text-red-400 font-bold text-sm">{worstPartner.wr}%</span>
                    <span className="text-xs text-slate-600">({worstPartner.wins}W/{worstPartner.total - worstPartner.wins}L)</span>
                  </div>
                </div>
              )}

              <div className="divide-y divide-slate-800/50">
                {pairList.map(({ member, wr, wins, total }) => (
                  <div key={member.user_id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: member.color ?? '#6366f1' }}>
                      {(member.display_name || member.username)[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white flex-1">{member.display_name || member.username}</span>
                    <div className="flex items-center gap-2">
                      {wr >= 55 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                        : wr <= 45 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        : <Minus className="w-3.5 h-3.5 text-slate-500" />}
                      <span className={`text-sm font-bold ${wr >= 55 ? 'text-green-400' : wr <= 45 ? 'text-red-400' : 'text-slate-400'}`}>{wr}%</span>
                      <span className="text-xs text-slate-600">({wins}W/{total - wins}L)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hero breakdown */}
          {Object.keys(heroCount).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="font-semibold text-white mb-3">Hero yang Dimainkan</h2>
              <div className="space-y-2">
                {Object.entries(heroCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([hero, count]) => (
                    <div key={hero} className="flex items-center gap-3">
                      <span className="text-sm text-white flex-1">{hero}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${(count / totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{count}x</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
