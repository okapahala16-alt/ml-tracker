'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Shared types (imported by page.tsx) ──────────────────────────────────────

export const MIN_GAMES = 5

export type PlayerEntry = {
  userId:       string
  username:     string
  displayName:  string
  games:        number
  wins:         number
  wr:           number   // 0–100
  kda:          number
  avgRating:    number   // 0–10, 0 = no ratings
  avgDeaths:    number
  uniqueHeroes: number
  topHero:      string
  maxWinStreak: number
  maxLoseStreak: number
}

export type HeroEntry = {
  id:         string
  name:       string
  role:       string
  games:      number
  wins:       number
  wr:         number
  kda:        number
  avgRating:  number
  mostUsedBy: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initial(name: string) {
  return name[0]?.toUpperCase() ?? '?'
}

function wrColor(wr: number) {
  if (wr < 40) return 'text-red-400'
  if (wr < 50) return 'text-yellow-400'
  if (wr < 60) return 'text-green-400'
  return 'text-blue-400'
}

const ROLE_COLOR: Record<string, string> = {
  tank:     'text-blue-400',
  fighter:  'text-orange-400',
  mage:     'text-purple-400',
  marksman: 'text-yellow-400',
  assassin: 'text-red-400',
  support:  'text-green-400',
}

// ── Podium ───────────────────────────────────────────────────────────────────

type RankedEntry = { player: PlayerEntry; value: number }

function Podium({ entries, formatValue }: { entries: RankedEntry[]; formatValue: (v: number) => string }) {
  const p1 = entries[0]
  const p2 = entries[1]
  const p3 = entries[2] ?? null

  const SLOTS = [
    p2 ? { data: p2, rank: 2, barH: 'h-20', medal: '🥈',
      ring: 'ring-slate-400/40', grad: 'from-slate-400 to-slate-600', val: 'text-slate-300' } : null,
    p1 ? { data: p1, rank: 1, barH: 'h-28', medal: '🥇',
      ring: 'ring-yellow-400/50', grad: 'from-yellow-400 to-amber-600', val: 'text-yellow-400' } : null,
    p3 ? { data: p3, rank: 3, barH: 'h-14', medal: '🥉',
      ring: 'ring-amber-600/40', grad: 'from-amber-700 to-orange-800', val: 'text-amber-500' } : null,
  ]

  const barStyles: Record<number, { background: string; border: string }> = {
    1: { background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' },
    2: { background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' },
    3: { background: 'rgba(205,127,50,0.08)', border: '1px solid rgba(205,127,50,0.15)' },
  }

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-5 pt-5 pb-6">
      {SLOTS.map((slot, i) => {
        if (!slot) return <div key={i} className="w-20 sm:w-24" />
        const { data, rank, barH, medal, ring, grad, val } = slot
        return (
          <Link key={rank} href={`/player/${data.player.username}`} className="flex flex-col items-center gap-1.5 group">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} ring-2 ${ring} flex items-center justify-center text-base font-black text-white group-hover:scale-110 transition-transform shadow-lg shrink-0`}>
              {initial(data.player.displayName)}
            </div>
            <div className="text-center max-w-[80px]">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-inter)' }}>{data.player.displayName}</p>
              <p className={`text-sm font-black ${val}`} style={{ fontFamily: 'var(--font-orbitron)' }}>{formatValue(data.value)}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{data.player.games}g</p>
            </div>
            <div className={`w-20 sm:w-24 ${barH} rounded-t-xl flex items-center justify-center`} style={barStyles[rank]}>
              <span className="text-xl">{medal}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Ranked list ───────────────────────────────────────────────────────────────

function RankList({
  entries,
  formatValue,
  startRank = 1,
}: {
  entries: RankedEntry[]
  formatValue: (v: number) => string
  startRank?: number
}) {
  if (entries.length === 0) return null
  return (
    <div className="space-y-0.5">
      {entries.map(({ player, value }, idx) => {
        const rank = startRank + idx
        return (
          <Link
            key={player.userId}
            href={`/player/${player.username}`}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors hover:bg-[#1A1A26] group"
          >
            <span className="w-5 text-xs font-bold text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{rank}</span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-[11px] font-black text-white shrink-0 group-hover:scale-105 transition-transform">
              {initial(player.displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{player.displayName}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>@{player.username} · {player.games} games</p>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>{formatValue(value)}</span>
          </Link>
        )
      })}
    </div>
  )
}

// ── Best category card ────────────────────────────────────────────────────────

function BestCategory({
  emoji, title, entries, formatValue,
}: {
  emoji: string
  title: string
  entries: RankedEntry[]
  formatValue: (v: number) => string
}) {
  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <div className="card rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-base">{emoji}</span>
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>{title}</h3>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{entries.length} player</span>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Belum ada player dengan min. {MIN_GAMES} games.
        </div>
      ) : (
        <div className="px-3 pb-3">
          {top3.length >= 2
            ? <Podium entries={top3} formatValue={formatValue} />
            : <div className="pt-3"><RankList entries={top3} formatValue={formatValue} /></div>
          }
          {rest.length > 0 && (
            <>
              <div className="my-1 mx-1" style={{ borderTop: '1px solid var(--border)' }} />
              <RankList entries={rest} formatValue={formatValue} startRank={4} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Worst category card ───────────────────────────────────────────────────────

function WorstCategory({
  emoji, title, note, entries, formatValue,
}: {
  emoji: string
  title: string
  note?: string
  entries: RankedEntry[]
  formatValue: (v: number) => string
}) {
  return (
    <div className="card rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-base">{emoji}</span>
        <div>
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>{title}</h3>
          {note && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{note}</p>}
        </div>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{entries.length} player</span>
      </div>

      <div className="px-3 py-3">
        {entries.length === 0 ? (
          <p className="text-xs italic py-3 text-center" style={{ color: 'var(--text-muted)' }}>
            Belum ada data cukup.
          </p>
        ) : (
          <RankList entries={entries} formatValue={formatValue} />
        )}
      </div>
    </div>
  )
}

// ── Hero Stats table ──────────────────────────────────────────────────────────

type HeroSortKey = 'games' | 'wr' | 'kda' | 'avgRating'

function HeroTable({ heroes }: { heroes: HeroEntry[] }) {
  const [sortKey, setSortKey] = useState<HeroSortKey>('games')
  const [asc, setAsc]         = useState(false)

  function toggleSort(key: HeroSortKey) {
    if (sortKey === key) setAsc((v) => !v)
    else { setSortKey(key); setAsc(false) }
  }

  const sorted = [...heroes].sort((a, b) => {
    const diff = (b[sortKey] as number) - (a[sortKey] as number)
    return asc ? -diff : diff
  })

  function ColHeader({ k, label }: { k: HeroSortKey; label: string }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:opacity-100"
        style={{
          fontFamily: 'var(--font-rajdhani)',
          color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
          opacity: active ? 1 : 0.8,
        }}
      >
        {label}
        {active && <span className="text-[8px] ml-0.5">{asc ? '▲' : '▼'}</span>}
      </button>
    )
  }

  const COLS = 'minmax(0,1.4fr) minmax(0,0.7fr) 4.5rem 4.5rem 4.5rem 4.5rem minmax(0,1fr)'

  return (
    <div className="card rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>Hero Stats</h3>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{heroes.length} hero dipakai</span>
      </div>

      {heroes.length === 0 ? (
        <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Belum ada hero yang dipakai.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header */}
            <div className="grid gap-3 px-5 py-3" style={{ gridTemplateColumns: COLS, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <div className="section-label">Hero</div>
              <div className="section-label">Role</div>
              <ColHeader k="games"     label="Games" />
              <ColHeader k="wr"        label="WR%" />
              <ColHeader k="kda"       label="KDA" />
              <ColHeader k="avgRating" label="Rating" />
              <div className="section-label">Most Used By</div>
            </div>

            {/* Rows */}
            <div>
              {sorted.map((hero, idx) => (
                <div
                  key={hero.id}
                  className="grid gap-3 px-5 py-3.5 items-center transition-colors hover:bg-[#1A1A26]"
                  style={{ gridTemplateColumns: COLS, borderTop: idx > 0 ? '1px solid var(--border)' : undefined }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {idx === 0 && <span className="text-xs shrink-0">🥇</span>}
                    {idx === 1 && <span className="text-xs shrink-0">🥈</span>}
                    {idx === 2 && <span className="text-xs shrink-0">🥉</span>}
                    {idx > 2   && <span className="text-[10px] w-3 shrink-0" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>}
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{hero.name}</span>
                  </div>
                  <div className={`text-xs capitalize ${ROLE_COLOR[hero.role] ?? 'text-slate-400'}`}>
                    {hero.role}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{hero.games}</div>
                  <div className={`text-sm font-semibold ${hero.wr >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {hero.wr.toFixed(0)}%
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{hero.kda.toFixed(2)}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {hero.avgRating > 0 ? hero.avgRating.toFixed(1) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {hero.mostUsedBy
                      ? <Link href={`/player/${hero.mostUsedBy}`} className="transition-colors hover:text-blue-400">@{hero.mostUsedBy}</Link>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main tabs ─────────────────────────────────────────────────────────────────

type Tab = 'best' | 'worst' | 'heroes'

interface Props {
  players: PlayerEntry[]
  heroes:  HeroEntry[]
}

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: 'best',   emoji: '🏆', label: 'Best Players' },
  { key: 'worst',  emoji: '💀', label: 'Worst Awards' },
  { key: 'heroes', emoji: '🦸', label: 'Hero Stats'   },
]

export default function LeaderboardTabs({ players, heroes }: Props) {
  const [tab, setTab] = useState<Tab>('best')

  const q = players.filter((p) => p.games >= MIN_GAMES)

  // ── Best ──────────────────────────────────────────────────────────────────

  const byWR = q
    .map((p) => ({ player: p, value: p.wr }))
    .sort((a, b) => b.value - a.value)

  const byKDA = q
    .map((p) => ({ player: p, value: p.kda }))
    .sort((a, b) => b.value - a.value)

  const byRating = q
    .filter((p) => p.avgRating > 0)
    .map((p) => ({ player: p, value: p.avgRating }))
    .sort((a, b) => b.value - a.value)

  const byWinStreak = q
    .filter((p) => p.maxWinStreak > 0)
    .map((p) => ({ player: p, value: p.maxWinStreak }))
    .sort((a, b) => b.value - a.value)

  const byVersatile = q
    .map((p) => ({ player: p, value: p.uniqueHeroes }))
    .sort((a, b) => b.value - a.value)

  // ── Worst ─────────────────────────────────────────────────────────────────

  const byAvgDeaths = q
    .map((p) => ({ player: p, value: p.avgDeaths }))
    .sort((a, b) => b.value - a.value)

  const byLoseStreak = q
    .filter((p) => p.maxLoseStreak > 0)
    .map((p) => ({ player: p, value: p.maxLoseStreak }))
    .sort((a, b) => b.value - a.value)

  const byLowestRating = q
    .filter((p) => p.avgRating > 0)
    .map((p) => ({ player: p, value: p.avgRating }))
    .sort((a, b) => a.value - b.value)

  const byOneTrick = q
    .filter((p) => p.uniqueHeroes < 3)
    .map((p) => ({ player: p, value: p.uniqueHeroes }))
    .sort((a, b) => a.value - b.value || b.player.games - a.player.games)

  const byLowestWR = q
    .map((p) => ({ player: p, value: p.wr }))
    .sort((a, b) => a.value - b.value)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'gradient-border' : 'card'}`}
            style={{
              fontFamily: 'var(--font-rajdhani)',
              color: tab === t.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            {t.emoji}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content — each conditional section mounts fresh on tab switch, triggering the CSS animation */}

      {tab === 'best' && (
        <div className="space-y-5" style={{ animation: 'tabFadeIn 0.18s ease-out both' }}>
          <BestCategory emoji="🏆" title="Highest Win Rate"
            entries={byWR}        formatValue={(v) => `${v.toFixed(1)}%`} />
          <BestCategory emoji="⚔️"  title="Best KDA Ratio"
            entries={byKDA}       formatValue={(v) => v.toFixed(2)} />
          <BestCategory emoji="⭐" title="Highest Avg Rating"
            entries={byRating}    formatValue={(v) => v.toFixed(1)} />
          <BestCategory emoji="🔥" title="Longest Win Streak"
            entries={byWinStreak} formatValue={(v) => `${v} beruntun`} />
          <BestCategory emoji="🦸" title="Most Versatile"
            entries={byVersatile} formatValue={(v) => `${v} hero`} />
        </div>
      )}

      {tab === 'worst' && (
        <div className="space-y-5" style={{ animation: 'tabFadeIn 0.18s ease-out both' }}>
          <WorstCategory emoji="💀" title="Most Deaths Per Game"
            entries={byAvgDeaths}    formatValue={(v) => `${v.toFixed(1)} avg`} />
          <WorstCategory emoji="😬" title="Longest Lose Streak"
            entries={byLoseStreak}   formatValue={(v) => `${v} beruntun`} />
          <WorstCategory emoji="🧊" title="Lowest Avg Rating"
            entries={byLowestRating} formatValue={(v) => v.toFixed(1)} />
          <WorstCategory emoji="🎭" title="One-Trick Pony"
            note="Min 5 games, < 3 hero berbeda"
            entries={byOneTrick}     formatValue={(v) => `${v} hero saja`} />
          <WorstCategory emoji="🐢" title="Lowest Win Rate"
            entries={byLowestWR}     formatValue={(v) => `${v.toFixed(1)}%`} />
        </div>
      )}

      {tab === 'heroes' && (
        <div style={{ animation: 'tabFadeIn 0.18s ease-out both' }}>
          <HeroTable heroes={heroes} />
        </div>
      )}
    </div>
  )
}
