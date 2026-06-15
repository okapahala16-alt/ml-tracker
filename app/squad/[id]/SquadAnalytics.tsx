'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Member = { user_id: string; display_name: string | null; username: string; color: string }
type Player = { user_id: string | null; in_game_name: string; kills: number; deaths: number; assists: number; rating: number | null }
type Match  = { id: string; result: 'win' | 'loss'; squad_match_players: Player[] }

interface Props {
  matches: Match[]
  members: Member[]
}

function kda(kills: number, deaths: number, assists: number) {
  return deaths > 0 ? (kills + assists) / deaths : kills + assists
}

export default function SquadAnalytics({ matches, members }: Props) {
  const stats = useMemo(() => {
    // Per-member stats
    const memberStats: Record<string, {
      wins: number; losses: number; kills: number; deaths: number; assists: number; ratingSum: number; ratingCount: number
    }> = {}

    members.forEach((m) => {
      memberStats[m.user_id] = { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, ratingSum: 0, ratingCount: 0 }
    })

    matches.forEach((match) => {
      match.squad_match_players.forEach((p) => {
        if (!p.user_id || !memberStats[p.user_id]) return
        const s = memberStats[p.user_id]
        if (match.result === 'win') s.wins++; else s.losses++
        s.kills   += p.kills
        s.deaths  += p.deaths
        s.assists += p.assists
        if (p.rating != null) { s.ratingSum += p.rating; s.ratingCount++ }
      })
    })

    // Winrate when playing with each specific other member (pairwise)
    const pairStats: Record<string, Record<string, { wins: number; total: number }>> = {}

    matches.forEach((match) => {
      const presentMembers = match.squad_match_players
        .filter((p) => p.user_id && memberStats[p.user_id])
        .map((p) => p.user_id as string)

      presentMembers.forEach((a) => {
        presentMembers.forEach((b) => {
          if (a === b) return
          if (!pairStats[a]) pairStats[a] = {}
          if (!pairStats[a][b]) pairStats[a][b] = { wins: 0, total: 0 }
          pairStats[a][b].total++
          if (match.result === 'win') pairStats[a][b].wins++
        })
      })
    })

    return { memberStats, pairStats }
  }, [matches, members])

  const totalMatches = matches.length
  const totalWins    = matches.filter((m) => m.result === 'win').length
  const overallWR    = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-4">Statistik Squad</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{totalMatches}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Match</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-black ${overallWR >= 50 ? 'text-green-400' : 'text-red-400'}`}>{overallWR}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Winrate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{totalWins}W/{totalMatches - totalWins}L</p>
            <p className="text-xs text-slate-500 mt-0.5">Record</p>
          </div>
        </div>
      </div>

      {/* Per member */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Performa per Anggota</h2>
        </div>
        <div className="divide-y divide-slate-800/50">
          {members.map((m) => {
            const s = stats.memberStats[m.user_id]
            if (!s) return null
            const total = s.wins + s.losses
            if (total === 0) return null
            const wr = Math.round((s.wins / total) * 100)
            const avgKDA = total > 0 ? kda(s.kills / total, s.deaths / total, s.assists / total) : 0
            const avgRating = s.ratingCount > 0 ? (s.ratingSum / s.ratingCount).toFixed(1) : '—'

            return (
              <div key={m.user_id} className="px-5 py-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: m.color ?? '#6366f1' }}
                >
                  {(m.display_name || m.username)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.display_name || m.username}</p>
                  <p className="text-xs text-slate-500">{total} match · KDA {avgKDA.toFixed(2)} · Rating {avgRating}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${wr >= 50 ? 'text-green-400' : 'text-red-400'}`}>{wr}%</p>
                  <p className="text-xs text-slate-500">{s.wins}W/{s.losses}L</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pairwise winrate */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Winrate Bermain Bareng</h2>
          <p className="text-xs text-slate-500 mt-0.5">Seberapa sering menang saat bermain bersama anggota tertentu</p>
        </div>
        <div className="divide-y divide-slate-800/50">
          {members.map((a) => {
            const pairs = stats.pairStats[a.user_id]
            if (!pairs) return null
            const entries = Object.entries(pairs)
              .map(([bId, data]) => {
                const b = members.find((m) => m.user_id === bId)
                if (!b || data.total < 1) return null
                const wr = Math.round((data.wins / data.total) * 100)
                return { b, wr, ...data }
              })
              .filter(Boolean)
              .sort((x, y) => (y!.wr - x!.wr))

            if (entries.length === 0) return null

            return (
              <div key={a.user_id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: a.color ?? '#6366f1' }}
                  >
                    {(a.display_name || a.username)[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white">{a.display_name || a.username}</span>
                  <span className="text-xs text-slate-500">bermain dengan:</span>
                </div>
                <div className="space-y-2 pl-8">
                  {entries.map((entry) => {
                    if (!entry) return null
                    const { b, wr, wins, total } = entry
                    return (
                      <div key={b.user_id} className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: b.color ?? '#6366f1' }}
                        >
                          {(b.display_name || b.username)[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-300 flex-1">{b.display_name || b.username}</span>
                        <div className="flex items-center gap-2">
                          {wr >= 55 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            : wr <= 45 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            : <Minus className="w-3.5 h-3.5 text-slate-500" />}
                          <span className={`text-sm font-bold ${wr >= 55 ? 'text-green-400' : wr <= 45 ? 'text-red-400' : 'text-slate-400'}`}>
                            {wr}%
                          </span>
                          <span className="text-xs text-slate-600">({wins}W/{total - wins}L)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
