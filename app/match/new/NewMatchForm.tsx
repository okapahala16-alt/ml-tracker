'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import {
  Trophy, CheckCircle2, AlertCircle,
  Camera, Loader2, RotateCcw, Swords, ChevronDown, Search, Pencil, User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MatchResultOverlay, { type Emblem, type OverlayPlayer } from '@/components/ui/MatchResultOverlay'

// ── Types ──────────────────────────────────────────────────────

type Hero   = { id: string; name: string; role: string }
type Season = { id: string; name: string } | null

type ScannedPlayer = {
  inGameName: string
  heroName:   string
  kills:      number
  deaths:     number
  assists:    number
  rating:     number
  emblem:     Emblem
}

type ScanResult = {
  result:  'win' | 'loss'
  players: ScannedPlayer[]
}

// ── Constants ─────────────────────────────────────────────────

const ROLE_ORDER  = ['tank', 'fighter', 'mage', 'marksman', 'assassin', 'support']
const ROLE_LABELS: Record<string, string> = {
  tank:     '🛡️ Tank',
  fighter:  '⚔️ Fighter',
  mage:     '🔮 Mage',
  marksman: '🏹 Marksman',
  assassin: '🗡️ Assassin',
  support:  '💚 Support',
}

const EMBLEM_DISPLAY: Record<Emblem, { label: string; color: string }> = {
  mvp:    { label: 'MVP',    color: 'text-yellow-400' },
  gold:   { label: 'Gold',   color: 'text-amber-400'  },
  silver: { label: 'Silver', color: 'text-slate-300'  },
  bronze: { label: 'Bronze', color: 'text-orange-500' },
}

// ── HeroSelect ────────────────────────────────────────────────

function HeroSelect({ heroes, value, onChange }: {
  heroes:   Hero[]
  value:    string
  onChange: (id: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef    = useRef<HTMLInputElement>(null)
  const selected = heroes.find((h) => h.id === value)

  const grouped = ROLE_ORDER.reduce<Record<string, Hero[]>>((acc, role) => {
    const list = heroes.filter(
      (h) => h.role === role && h.name.toLowerCase().includes(search.toLowerCase()),
    )
    if (list.length) acc[role] = list
    return acc
  }, {})

  useEffect(() => { if (open) searchRef.current?.focus() }, [open])
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mythic-input w-full flex items-center justify-between gap-2 px-3 py-2 text-sm"
        style={open ? { borderColor: 'var(--accent-blue)', boxShadow: '0 0 0 2px rgba(79,142,247,0.15)' } : {}}
      >
        <span style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: selected ? 500 : 400 }}>
          {selected ? selected.name : 'Pilih hero...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl shadow-2xl shadow-black/60 overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glow)' }}>
          <div className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari hero..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {Object.entries(grouped).map(([role, list]) => (
              <div key={role}>
                <div className="sticky top-0 px-3 py-1 section-label" style={{ background: 'var(--bg-card)' }}>
                  {ROLE_LABELS[role]}
                </div>
                {list.map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => { onChange(hero.id); setOpen(false); setSearch('') }}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      color: hero.id === value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      background: hero.id === value ? 'rgba(79,142,247,0.08)' : 'transparent',
                    }}
                  >
                    {hero.name}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Hero tidak ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

interface Props {
  season: Season
  heroes: Hero[]
}

export default function NewMatchForm({ season, heroes }: Props) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]

  const [scanResult,      setScanResult]      = useState<ScanResult | null>(null)
  const [selectedPlayer,  setSelectedPlayer]  = useState<ScannedPlayer | null>(null)
  const [overrideHeroId,  setOverrideHeroId]  = useState<string>('')
  const [editingHero,     setEditingHero]     = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [isScanning,      setIsScanning]      = useState(false)
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [overlayPlayers,  setOverlayPlayers]  = useState<OverlayPlayer[] | null>(null)
  const [username,        setUsername]        = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('username, display_name').eq('id', user.id).single()
        .then(({ data }) => { if (data) setUsername(data.display_name || data.username) })
    })
  }, [])

  // ── Screenshot handler ──
  async function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setError(null)
    setScanResult(null)
    setSelectedPlayer(null)
    setOverrideHeroId('')
    setEditingHero(false)

    try {
      const fd = new FormData()
      fd.append('screenshot', file)

      const res  = await fetch('/api/parse-screenshot', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal membaca screenshot')

      const validEmblems = ['mvp', 'gold', 'silver', 'bronze']
      const players: ScannedPlayer[] = (data.players ?? []).map((p: ScannedPlayer) => ({
        ...p,
        emblem: validEmblems.includes(p.emblem) ? p.emblem : 'silver' as Emblem,
      }))

      if (players.length === 0) throw new Error('Tidak ada data player terbaca. Coba screenshot lebih jelas.')

      setScanResult({ result: data.result === 'win' ? 'win' : 'loss', players })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses screenshot')
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Pick player ──
  function handlePickPlayer(player: ScannedPlayer) {
    setSelectedPlayer(player)
    const matched = heroes.find(
      (h) => h.name.toLowerCase() === player.heroName.toLowerCase()
    )
    setOverrideHeroId(matched?.id ?? '')
    setEditingHero(!matched)
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scanResult || !selectedPlayer) return
    if (!overrideHeroId) { setError('Pilih hero terlebih dahulu.'); setEditingHero(true); return }

    setError(null)
    setIsSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        season_id:  season?.id ?? null,
        match_date: today,
        result:     scanResult.result,
        created_by: user.id,
      })
      .select()
      .single()

    if (matchErr) {
      setError(`Gagal menyimpan match: ${matchErr.message}`)
      setIsSubmitting(false)
      return
    }

    const { error: playerErr } = await supabase.from('match_players').insert({
      match_id: match.id,
      user_id:  user.id,
      hero_id:  overrideHeroId,
      kills:    selectedPlayer.kills,
      deaths:   selectedPlayer.deaths,
      assists:  selectedPlayer.assists,
      rating:   selectedPlayer.rating,
      emblem:   selectedPlayer.emblem,
    })

    if (playerErr) {
      await supabase.from('matches').delete().eq('id', match.id)
      setError(`Gagal menyimpan stats: ${playerErr.message}`)
      setIsSubmitting(false)
      return
    }

    setOverlayPlayers([{ username, emblem: selectedPlayer.emblem, result: scanResult.result }])
    setIsSubmitting(false)
  }

  function handleOverlayClose() {
    setOverlayPlayers(null)
    router.push('/dashboard?success=match_added')
    router.refresh()
  }

  const selectedHero = heroes.find((h) => h.id === overrideHeroId)
  const aiHeroName   = selectedPlayer?.heroName ?? ''
  const heroMismatch = selectedHero && selectedHero.name.toLowerCase() !== aiHeroName.toLowerCase()

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {overlayPlayers && (
          <MatchResultOverlay players={overlayPlayers} onClose={handleOverlayClose} />
        )}
      </AnimatePresence>

      <div className="p-5 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-7">
          <p className="section-label mb-1">Catat Pertandingan</p>
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
            INPUT MATCH
          </h1>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--loss)' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {!scanResult && (
          <div className="card rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl rounded-full" style={{ background: 'rgba(79,142,247,0.25)' }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
                <Camera className="w-7 h-7" style={{ color: 'var(--accent-blue)' }} />
              </div>
            </div>
            <div>
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>Upload Screenshot Match</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Foto scoreboard akhir match — K/D/A, hero, dan hasil dibaca otomatis
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="mythic-btn-primary inline-flex items-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Membaca screenshot...</>
                : <><Camera className="w-4 h-4" /> Pilih Screenshot</>
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
          </div>
        )}

        {/* ── Step 2: Pick yourself ── */}
        {scanResult && !selectedPlayer && (
          <div className="space-y-4">
            {/* Result banner */}
            <div
              className="flex items-center justify-center gap-3 py-3 rounded-2xl font-black text-base tracking-widest"
              style={{
                background: scanResult.result === 'win' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${scanResult.result === 'win' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: scanResult.result === 'win' ? 'var(--win)' : 'var(--loss)',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              <Trophy className="w-4 h-4" />
              {scanResult.result === 'win' ? 'VICTORY' : 'DEFEAT'}
            </div>

            <div className="card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>Tap nama kamu</p>
              </div>
              <div className="space-y-2">
                {scanResult.players.map((player, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickPlayer(player)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.background = 'rgba(79,142,247,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  >
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{player.inGameName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{player.heroName} · {player.kills}/{player.deaths}/{player.assists}</p>
                    </div>
                    <span className={`text-xs font-bold ${EMBLEM_DISPLAY[player.emblem].color}`}>
                      {EMBLEM_DISPLAY[player.emblem].label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setScanResult(null); setError(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-rajdhani)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Scan Ulang
            </button>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {scanResult && selectedPlayer && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Result banner */}
            <div
              className="flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg tracking-widest"
              style={{
                background: scanResult.result === 'win' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${scanResult.result === 'win' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: scanResult.result === 'win' ? 'var(--win)' : 'var(--loss)',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              <Trophy className="w-5 h-5" />
              {scanResult.result === 'win' ? 'VICTORY' : 'DEFEAT'}
            </div>

            {/* Stats card */}
            <div className="card rounded-2xl p-5">
              <p className="section-label mb-4">Stats Kamu</p>

              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)' }}
                >
                  <Swords className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingHero ? (
                    <div className="space-y-1">
                      <HeroSelect
                        heroes={heroes}
                        value={overrideHeroId}
                        onChange={(id) => { setOverrideHeroId(id); setEditingHero(false) }}
                      />
                      {aiHeroName && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI mendeteksi: <span style={{ color: 'var(--text-primary)' }}>{aiHeroName}</span></p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-orbitron)' }}>
                          {selectedHero?.name ?? <span style={{ color: 'var(--gold)' }} className="text-base">Pilih hero</span>}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingHero(true)}
                          className="p-1 rounded-md transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {selectedHero && (
                        <p className="text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>
                          {ROLE_LABELS[selectedHero.role]?.replace(/^\S+\s/, '') ?? selectedHero.role}
                        </p>
                      )}
                      {heroMismatch && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--gold)' }}>AI mendeteksi: {aiHeroName}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedPlayer.inGameName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Kills',   value: selectedPlayer.kills,   color: 'var(--win)'  },
                  { label: 'Deaths',  value: selectedPlayer.deaths,  color: 'var(--loss)'    },
                  { label: 'Assists', value: selectedPlayer.assists, color: 'var(--accent-blue)'   },
                  { label: 'Rating',  value: selectedPlayer.rating,  color: 'var(--gold)' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color, fontFamily: 'var(--font-orbitron)' }}>{value}</p>
                    <p className="section-label mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Emblem */}
            <div className="card rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="section-label mb-1">Emblem</p>
                <p className={`text-lg font-black tracking-widest ${EMBLEM_DISPLAY[selectedPlayer.emblem].color}`} style={{ fontFamily: 'var(--font-orbitron)' }}>
                  {EMBLEM_DISPLAY[selectedPlayer.emblem].label}
                </p>
              </div>
              <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>Dibaca dari<br />screenshot</p>
            </div>

            {/* Season */}
            {season && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: 'var(--win)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{season.name}</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--win)', background: 'rgba(34,197,94,0.1)', fontFamily: 'var(--font-rajdhani)' }}>AKTIF</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pb-4">
              <button
                type="button"
                onClick={() => { setSelectedPlayer(null); setOverrideHeroId(''); setEditingHero(false) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-rajdhani)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Pilih Ulang
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 mythic-btn-primary flex items-center justify-center gap-2 px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                {isSubmitting ? 'Menyimpan...' : 'Simpan Match'}
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
          </form>
        )}
      </div>
    </>
  )
}
