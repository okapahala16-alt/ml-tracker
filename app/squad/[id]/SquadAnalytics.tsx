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

// Normalize: lowercase + trim + strip trailing dots → groups "Fyruss" / "Fyruss." / "FYRUSS" together
function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\.+$/, '').trim()
}

// Pick best display version: prefer no trailing dot, prefer Title Case over ALL CAPS
function bestName(rawNames: string[]): string {
  const noDot = rawNames.filter((n) => !n.trimEnd().endsWith('.'))
  const pool  = noDot.length > 0 ? noDot : rawNames
  const notAllCaps = pool.filter((n) => n !== n.toUpperCase())
  return notAllCaps.length > 0 ? notAllCaps[0] : pool[0]
}

export default function SquadAnalytics({ matches, members }: Props) {
  const { nameStats, pairStats, nameToMember, displayName, allNames } = useMemo(() => {
    // Collect raw names per normalized key
    const rawNamesMap: Record<string, string[]> = {}
    matches.forEach((match) => {
      match.squad_match_players.forEach((p) => {
        const key = norm(p.in_game_name)
        if (!rawNamesMap[key]) rawNamesMap[key] = []
        if (!rawNamesMap[key].includes(p.in_game_name)) rawNamesMap[key].push(p.in_game_name)
      })
    })

    // Best display name per normalized key
    const displayName: Record<string, string> = {}
    Object.entries(rawNamesMap).forEach(([key, raws]) => { displayName[key] = bestName(raws) })

    // Map normalized key → member (if claimed)
    const nameToMember: Record<string, Member | null> = {}
    matches.forEach((match) => {
      match.squad_match_players.forEach((p) => {
        const key = norm(p.in_game_name)
        if (!nameToMember[key] && p.user_id) {
          nameToMember[key] = members.find((m) => m.user_id === p.user_id) ?? null
        }
      })
    })

    // Per-name stats grouped by normalized key
    const nameStats: Record<string, {
      wins: number; losses: number
      kills: number; deaths: number; assists: number
      ratingSum: number; ratingCount: number
    }> = {}

    matches.forEach((match) => {
      match.squad_match_players.forEach((p) => {
        const key = norm(p.in_game_name)
        if (!nameStats[key]) {
          nameStats[key] = { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, ratingSum: 0, ratingCount: 0 }
        }
        const s = nameStats[key]
        if (match.result === 'win') s.wins++; else s.losses++
        s.kills   += p.kills
        s.deaths  += p.deaths
        s.assists += p.assists
        if (p.rating != null) { s.ratingSum += p.rating; s.ratingCount++ }
      })
    })

    // Pairwise winrate by normalized key
    const pairStats: Record<string, Record<string, { wins: number; total: number }>> = {}

    matches.forEach((match) => {
      const keys = Array.from(new Set(match.squad_match_players.map((p) => norm(p.in_game_name))))
      keys.forEach((a) => {
        keys.forEach((b) => {
          if (a === b) return
          if (!pairStats[a]) pairStats[a] = {}
          if (!pairStats[a][b]) pairStats[a][b] = { wins: 0, total: 0 }
          pairStats[a][b].total++
          if (match.result === 'win') pairStats[a][b].wins++
        })
      })
    })

    const allNames = Object.keys(nameStats).sort((a, b) => displayName[a].localeCompare(displayName[b]))
    return { nameStats, pairStats, nameToMember, displayName, allNames }
  }, [matches, members])

  const totalMatches = matches.length
  const totalWins    = matches.filter((m) => m.result === 'win').length
  const overallWR    = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0

  function getDisplayName(key: string) {
    const member = nameToMember[key]
    return member ? (member.display_name || member.username) : displayName[key]
  }

  function getColor(key: string) {
    return nameToMember[key]?.color ?? '#475569'
  }

  function getInitial(key: string) {
    return getDisplayName(key)[0]?.toUpperCase()
  }

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

      {/* Per player */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Performa per Anggota</h2>
        </div>
        <div className="divide-y divide-slate-800/50">
          {allNames.map((name) => {
            const s = nameStats[name]
            const total = s.wins + s.losses
            if (total === 0) return null
            const wr = Math.round((s.wins / total) * 100)
            const avgKDA = kda(s.kills / total, s.deaths / total, s.assists / total)
            const avgRating = s.ratingCount > 0 ? (s.ratingSum / s.ratingCount).toFixed(1) : '—'

            return (
              <div key={name} className="px-5 py-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: getColor(name) }}
                >
                  {getInitial(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{getDisplayName(name)}</p>
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
          {allNames.map((nameA) => {
            const pairs = pairStats[nameA]
            if (!pairs) return null
            const entries = Object.entries(pairs)
              .filter(([, d]) => d.total >= 1)
              .map(([nameB, d]) => ({ nameB, wr: Math.round((d.wins / d.total) * 100), ...d }))
              .sort((x, y) => y.wr - x.wr)

            if (entries.length === 0) return null

            return (
              <div key={nameA} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: getColor(nameA) }}
                  >
                    {getInitial(nameA)}
                  </div>
                  <span className="text-sm font-semibold text-white">{getDisplayName(nameA)}</span>
                  <span className="text-xs text-slate-500">bermain dengan:</span>
                </div>
                <div className="space-y-2 pl-8">
                  {entries.map(({ nameB, wr, wins, total }) => (
                    <div key={nameB} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getColor(nameB) }}
                      >
                        {getInitial(nameB)}
                      </div>
                      <span className="text-sm text-slate-300 flex-1 truncate">{getDisplayName(nameB)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {wr >= 55 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          : wr <= 45 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          : <Minus className="w-3.5 h-3.5 text-slate-500" />}
                        <span className={`text-sm font-bold ${wr >= 55 ? 'text-green-400' : wr <= 45 ? 'text-red-400' : 'text-slate-400'}`}>
                          {wr}%
                        </span>
                        <span className="text-xs text-slate-600">({wins}W/{total - wins}L)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
