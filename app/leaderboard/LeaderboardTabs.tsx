'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Shared types (imported by page.tsx) ──────────────────────────────────────

export const MIN_GAMES = 5

export type PlayerEntry = {
  userId:        string
  username:      string
  displayName:   string
  games:         number
  wins:          number
  wr:            number
  kda:           number
  avgRating:     number
  avgDeaths:     number
  uniqueHeroes:  number
  topHero:       string
  maxWinStreak:  number
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
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name[0]?.toUpperCase() ?? '?')
}

// ── Role badge ────────────────────────────────────────────────────────────────

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
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={s}
    >
      {role}
    </span>
  )
}

// ── Podium ───────────────────────────────────────────────────────────────────

type RankedEntry = { player: PlayerEntry; value: number }

const PODIUM_CFG: Record<1|2|3, {
  avatarBg: string; avatarBorder: string; avatarColor: string; avatarShadow?: string
  barBorder: string; numColor: string; barHeight: string
}> = {
  1: {
    avatarBg:     'rgba(255,215,0,0.15)',
    avatarBorder: '1.5px solid var(--mvp-gold)',
    avatarColor:  'var(--mvp-gold)',
    avatarShadow: '0 0 12px rgba(255,215,0,0.35)',
    barBorder:    '1px solid rgba(255,215,0,0.4)',
    numColor:     'var(--mvp-gold)',
    barHeight:    '90px',
  },
  2: {
    avatarBg:     'rgba(148,163,184,0.15)',
    avatarBorder: '1.5px solid var(--silver)',
    avatarColor:  'var(--silver)',
    barBorder:    '1px solid var(--border)',
    numColor:     'var(--silver)',
    barHeight:    '64px',
  },
  3: {
    avatarBg:     'rgba(205,127,50,0.15)',
    avatarBorder: '1.5px solid var(--bronze)',
    avatarColor:  'var(--bronze)',
    barBorder:    '1px solid var(--border)',
    numColor:     'var(--bronze)',
    barHeight:    '48px',
  },
}

function Podium({
  entries,
  formatValue,
}: {
  entries: RankedEntry[]
  formatValue: (v: number) => string
}) {
  const slots: ({ data: RankedEntry; rank: 1|2|3 } | null)[] = [
    entries[1] ? { data: entries[1], rank: 2 } : null,
    entries[0] ? { data: entries[0], rank: 1 } : null,
    entries[2] ? { data: entries[2], rank: 3 } : null,
  ]

  return (
    <div className="flex items-end justify-center gap-4 py-5">
      {slots.map((slot, i) => {
        if (!slot) return <div key={i} style={{ width: 80 }} />
        const { data, rank } = slot
        const cfg = PODIUM_CFG[rank]
        return (
          <Link
            key={rank}
            href={`/player/${data.player.username}`}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 group-hover:scale-110 transition-transform"
              style={{
                background: cfg.avatarBg,
                border:     cfg.avatarBorder,
                color:      cfg.avatarColor,
                boxShadow:  cfg.avatarShadow,
              }}
            >
              {initial(data.player.displayName)}
            </div>
            <p
              className="text-center truncate"
              style={{
                maxWidth:   76,
                fontSize:   13,
                fontWeight: 500,
                fontFamily: 'var(--font-rajdhani)',
                color:      'var(--text-primary)',
              }}
            >
              {data.player.displayName}
            </p>
            <p className="text-center" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {formatValue(data.value)}
            </p>
            <div
              className="flex items-center justify-center"
              style={{
                width:        80,
                height:       cfg.barHeight,
                background:   'rgba(255,255,255,0.02)',
                border:       cfg.barBorder,
                borderRadius: '8px 8px 0 0',
              }}
            >
              <span style={{ color: cfg.numColor, fontWeight: 700, fontSize: 18 }}>{rank}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Full ranking table ────────────────────────────────────────────────────────

function FullRankingTable({
  entries,
  formatValue,
}: {
  entries: RankedEntry[]
  formatValue: (v: number) => string
}) {
  if (entries.length === 0) return null
  const rankColors: Record<number, string> = {
    1: 'var(--mvp-gold)',
    2: 'var(--silver)',
    3: 'var(--bronze)',
  }

  return (
    <div
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        overflow:     'hidden',
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: '36px 1fr 110px 64px',
          padding:             '10px 16px',
          background:          'rgba(255,255,255,0.025)',
          borderBottom:        '1px solid var(--border)',
        }}
      >
        {['#', 'PLAYER', 'VALUE', 'GAMES'].map((h) => (
          <span key={h} className="section-label">{h}</span>
        ))}
      </div>

      {entries.map(({ player, value }, idx) => {
        const rank     = idx + 1
        const numColor = rankColors[rank]
        return (
          <Link
            key={player.userId}
            href={`/player/${player.username}`}
            className="grid items-center transition-colors hover:bg-[#1A1A26]"
            style={{
              gridTemplateColumns: '36px 1fr 110px 64px',
              padding:             '10px 16px',
              borderTop:           '1px solid var(--border)',
            }}
          >
            <span
              style={{
                color:      numColor ?? 'var(--text-secondary)',
                fontWeight: numColor ? 700 : 400,
                fontSize:   13,
              }}
            >
              {rank}
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-sm"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)', fontWeight: 500 }}
              >
                {player.displayName}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                @{player.username}
              </p>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-blue)' }}>
              {formatValue(value)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {player.games}g
            </span>
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
  return (
    <div
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: 16,
        overflow:     'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-lg">{emoji}</span>
        <h3
          className="text-sm font-semibold"
          style={{
            fontFamily:    'var(--font-rajdhani)',
            color:         'var(--text-primary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h3>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {entries.length} player
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-10 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Belum ada player dengan min. {MIN_GAMES} games.
        </div>
      ) : (
        <div className="px-4 pb-4">
          {entries.length >= 2 && (
            <Podium entries={entries.slice(0, 3)} formatValue={formatValue} />
          )}
          <FullRankingTable entries={entries} formatValue={formatValue} />
        </div>
      )}
    </div>
  )
}

// ── Worst award card ──────────────────────────────────────────────────────────

function WorstCard({
  emoji, title, note, entry, formatValue,
}: {
  emoji:       string
  title:       string
  note?:       string
  entry?:      RankedEntry
  formatValue: (v: number) => string
}) {
  return (
    <div
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        padding:      '20px',
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
        <div>
          <p
            className="font-semibold text-xs uppercase"
            style={{
              fontFamily:    'var(--font-rajdhani)',
              color:         'var(--text-secondary)',
              letterSpacing: '0.08em',
            }}
          >
            {title}
          </p>
          {note && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {note}
            </p>
          )}
        </div>
      </div>
      {entry ? (
        <Link href={`/player/${entry.player.username}`}>
          <p
            className="font-bold mb-1 hover:opacity-80 transition-opacity truncate"
            style={{
              fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
              fontSize:   18,
              color:      'var(--loss)',
            }}
          >
            {entry.player.displayName}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {formatValue(entry.value)}
          </p>
        </Link>
      ) : (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Belum ada data cukup.
        </p>
      )}
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
        className="flex items-center gap-0.5 transition-opacity hover:opacity-100"
        style={{
          fontFamily:    'var(--font-rajdhani)',
          fontSize:      10,
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         active ? 'var(--accent-blue)' : 'var(--text-secondary)',
          opacity:       active ? 1 : 0.8,
        }}
      >
        {label}
        {active && <span style={{ fontSize: 8, marginLeft: 2 }}>{asc ? '▲' : '▼'}</span>}
      </button>
    )
  }

  const COLS = 'minmax(0,1.4fr) 90px 4.5rem 4.5rem 4.5rem 4.5rem minmax(0,1fr)'

  return (
    <div
      style={{
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: 16,
        overflow:     'hidden',
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3
          className="font-semibold text-sm"
          style={{
            fontFamily:    'var(--font-rajdhani)',
            color:         'var(--text-primary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Hero Stats
        </h3>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {heroes.length} hero dipakai
        </span>
      </div>

      {heroes.length === 0 ? (
        <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Belum ada hero yang dipakai.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className="grid gap-3 px-5 py-3"
              style={{
                gridTemplateColumns: COLS,
                background:          'rgba(255,255,255,0.02)',
                borderBottom:        '1px solid var(--border)',
              }}
            >
              <span className="section-label">Hero</span>
              <span className="section-label">Role</span>
              <ColHeader k="games"     label="Games"  />
              <ColHeader k="wr"        label="WR%"    />
              <ColHeader k="kda"       label="KDA"    />
              <ColHeader k="avgRating" label="Rating" />
              <span className="section-label">Most Used By</span>
            </div>

            <div>
              {sorted.map((hero, idx) => (
                <div
                  key={hero.id}
                  className="grid gap-3 px-5 py-3.5 items-center transition-colors hover:bg-[#1A1A26]"
                  style={{
                    gridTemplateColumns: COLS,
                    borderTop:           idx > 0 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {idx < 3 ? (
                      <span className="text-xs shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-[10px] w-3 shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </span>
                    )}
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {hero.name}
                    </span>
                  </div>

                  <div>
                    <RoleBadge role={hero.role} />
                  </div>

                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {hero.games}
                  </div>
                  <div className={`text-sm font-semibold ${hero.wr >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {hero.wr.toFixed(0)}%
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {hero.kda.toFixed(2)}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {hero.avgRating > 0 ? (
                      hero.avgRating.toFixed(1)
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {hero.mostUsedBy ? (
                      <Link href={`/player/${hero.mostUsedBy}`} className="transition-colors hover:text-blue-400">
                        @{hero.mostUsedBy}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
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
      {/* Pill tab strip */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-5 py-2 font-semibold transition-all"
            style={{
              borderRadius:  999,
              fontFamily:    'var(--font-rajdhani)',
              fontWeight:    600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize:      13,
              background:    tab === t.key
                ? 'linear-gradient(135deg, #4F8EF7, #7C3AED)'
                : 'transparent',
              color:  tab === t.key ? '#fff' : 'var(--text-secondary)',
              border: tab === t.key ? '1px solid transparent' : '1px solid var(--border)',
            }}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

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
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ animation: 'tabFadeIn 0.18s ease-out both' }}
        >
          <WorstCard emoji="💀" title="Most Deaths Per Game"
            entry={byAvgDeaths[0]}    formatValue={(v) => `${v.toFixed(1)} avg`} />
          <WorstCard emoji="😬" title="Longest Lose Streak"
            entry={byLoseStreak[0]}   formatValue={(v) => `${v}x beruntun`} />
          <WorstCard emoji="🧊" title="Lowest Avg Rating"
            entry={byLowestRating[0]} formatValue={(v) => v.toFixed(1)} />
          <WorstCard emoji="🎭" title="One-Trick Pony"
            note="Min 5 games, < 3 hero berbeda"
            entry={byOneTrick[0]}     formatValue={(v) => `${v} hero saja`} />
          <WorstCard emoji="🐢" title="Lowest Win Rate"
            entry={byLowestWR[0]}     formatValue={(v) => `${v.toFixed(1)}%`} />
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
