'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, ChevronLeft, Check, Pencil, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Member = { user_id: string; display_name: string | null; username: string; color: string }
type Hero   = { id: string; name: string; role: string }

type DetectedPlayer = {
  inGameName: string
  heroName: string
  kills: number
  deaths: number
  assists: number
  rating: number
  assignedUserId: string | null
  heroId: string | null
  editingHero: boolean
}

interface Props {
  squadId:          string
  squadName:        string
  userId:           string
  members:          Member[]
  existingMappings: Record<string, string>
  heroes:           Hero[]
}

type Step = 'upload' | 'assign' | 'confirm'

export default function SquadUploadForm({ squadId, squadName, userId, members, existingMappings, heroes }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,     setStep]     = useState<Step>('upload')
  const [scanning, setScanning] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [result,   setResult]   = useState<'win' | 'loss'>('win')
  const [players,  setPlayers]  = useState<DetectedPlayer[]>([])
  const [heroSearch, setHeroSearch] = useState('')

  function resolveHeroId(heroName: string): string | null {
    const lower = heroName.toLowerCase().trim()
    return heroes.find((h) => h.name.toLowerCase() === lower)?.id ?? null
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('screenshot', file)
      const res  = await fetch('/api/parse-screenshot', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal scan')

      setResult(data.result ?? 'win')

      // Only left team (first 5 players)
      const leftTeam = (data.players ?? []).slice(0, 5)

      const detected: DetectedPlayer[] = leftTeam.map((p: { inGameName: string; heroName: string; kills: number; deaths: number; assists: number; rating: number }) => {
        const mappedUserId = existingMappings[p.inGameName.toLowerCase()] ?? null
        return {
          inGameName:     p.inGameName,
          heroName:       p.heroName,
          kills:          p.kills   ?? 0,
          deaths:         p.deaths  ?? 0,
          assists:        p.assists ?? 0,
          rating:         Math.min(p.rating ?? 0, 20),
          assignedUserId: mappedUserId,
          heroId:         resolveHeroId(p.heroName),
          editingHero:    false,
        }
      })

      setPlayers(detected)
      setStep('assign')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal scan screenshot')
    } finally {
      setScanning(false)
    }
  }

  function assignPlayer(playerIdx: number, userId: string | null) {
    setPlayers((prev) => prev.map((p, i) => i === playerIdx ? { ...p, assignedUserId: userId } : p))
  }

  function setHeroId(playerIdx: number, heroId: string | null, heroName: string) {
    setPlayers((prev) => prev.map((p, i) => i === playerIdx ? { ...p, heroId, heroName, editingHero: false } : p))
    setHeroSearch('')
  }

  function toggleEditHero(idx: number) {
    setPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, editingHero: !p.editingHero } : { ...p, editingHero: false }))
    setHeroSearch('')
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const today    = new Date().toISOString().slice(0, 10)

    // Insert squad match
    const { data: match, error: matchErr } = await supabase
      .from('squad_matches')
      .insert({ squad_session_id: squadId, result, match_date: today, uploaded_by: userId })
      .select('id')
      .single()

    if (matchErr || !match) {
      setError('Gagal menyimpan match.')
      setSaving(false)
      return
    }

    // Insert squad match players
    const { error: playersErr } = await supabase
      .from('squad_match_players')
      .insert(
        players.map((p) => ({
          squad_match_id: match.id,
          in_game_name:   p.inGameName,
          user_id:        p.assignedUserId,
          hero_id:        p.heroId,
          kills:          p.kills,
          deaths:         p.deaths,
          assists:        p.assists,
          rating:         p.rating > 0 ? p.rating : null,
        }))
      )

    if (playersErr) {
      setError('Gagal menyimpan player stats.')
      setSaving(false)
      return
    }

    // Save/update name mappings for assigned players
    const mappingUpserts = players
      .filter((p) => p.assignedUserId)
      .map((p) => ({
        squad_session_id: squadId,
        in_game_name:     p.inGameName,
        user_id:          p.assignedUserId!,
      }))

    if (mappingUpserts.length > 0) {
      await supabase
        .from('squad_name_mappings')
        .upsert(mappingUpserts, { onConflict: 'squad_session_id,in_game_name' })
    }

    // ── Auto-sync to personal match_players ──
    const assignedPlayers = players.filter((p) => p.assignedUserId)
    if (assignedPlayers.length > 0) {
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      const { data: personalMatch } = await supabase
        .from('matches')
        .insert({
          season_id:  activeSeason?.id ?? null,
          match_date: today,
          result,
          created_by: userId,
        })
        .select('id')
        .single()

      if (personalMatch) {
        await supabase.from('match_players').insert(
          assignedPlayers.map((p) => ({
            match_id: personalMatch.id,
            user_id:  p.assignedUserId,
            hero_id:  p.heroId,
            kills:    p.kills,
            deaths:   p.deaths,
            assists:  p.assists,
            rating:   p.rating > 0 ? p.rating : null,
          }))
        )
      }
    }

    router.push(`/squad/${squadId}`)
    router.refresh()
  }

  const filteredHeroes = heroSearch
    ? heroes.filter((h) => h.name.toLowerCase().includes(heroSearch.toLowerCase()))
    : heroes

  // ── Step: Upload ──
  if (step === 'upload') {
    return (
      <div className="p-5 lg:p-8 max-w-lg mx-auto">
        <Link href={`/squad/${squadId}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> {squadName}
        </Link>
        <h1 className="text-xl font-bold text-white mb-1">Upload Match</h1>
        <p className="text-slate-400 text-sm mb-7">Screenshot hasil pertandingan squad</p>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full flex flex-col items-center justify-center gap-4 py-16 border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl bg-slate-900 hover:bg-slate-800/50 transition-all group"
        >
          {scanning ? (
            <><Loader2 className="w-10 h-10 text-blue-400 animate-spin" /><p className="text-slate-400 text-sm">Menganalisa screenshot...</p></>
          ) : (
            <><Upload className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition-colors" /><p className="text-slate-400 text-sm group-hover:text-white transition-colors">Tap untuk upload screenshot</p></>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />

        {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
      </div>
    )
  }

  // ── Step: Assign ──
  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      <Link href={`/squad/${squadId}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" /> {squadName}
      </Link>

      {/* Result toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-slate-400">Hasil:</span>
        <button
          onClick={() => setResult('win')}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${result === 'win' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'text-slate-500 border border-slate-700 hover:border-slate-600'}`}
        >
          Menang
        </button>
        <button
          onClick={() => setResult('loss')}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${result === 'loss' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-slate-500 border border-slate-700 hover:border-slate-600'}`}
        >
          Kalah
        </button>
      </div>

      <h2 className="text-lg font-bold text-white mb-1">Assign Anggota</h2>
      <p className="text-slate-400 text-sm mb-5">Cocokkan nama in-game dengan anggota squad</p>

      <div className="space-y-3 mb-6">
        {players.map((p, idx) => {
          const assigned = members.find((m) => m.user_id === p.assignedUserId)
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {/* In-game name + hero */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{p.inGameName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {p.editingHero ? (
                      <div className="flex-1">
                        <input
                          autoFocus
                          value={heroSearch}
                          onChange={(e) => setHeroSearch(e.target.value)}
                          placeholder="Cari hero..."
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        {heroSearch && (
                          <div className="absolute z-10 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                            {filteredHeroes.slice(0, 10).map((h) => (
                              <button
                                key={h.id}
                                onClick={() => setHeroId(idx, h.id, h.name)}
                                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-700 transition-colors"
                              >
                                {h.name} <span className="text-slate-500 capitalize">({h.role})</span>
                              </button>
                            ))}
                            {filteredHeroes.length === 0 && (
                              <p className="px-3 py-2 text-xs text-slate-500">Tidak ditemukan</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-slate-400">{p.heroName || '—'}</span>
                        <button onClick={() => toggleEditHero(idx)} className="text-slate-600 hover:text-slate-400 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.kills}/{p.deaths}/{p.assists} · Rating {p.rating > 0 ? p.rating.toFixed(1) : '—'}
                  </p>
                </div>

                {/* Member assignment */}
                <div className="shrink-0">
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[180px]">
                    <button
                      onClick={() => assignPlayer(idx, null)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border ${!p.assignedUserId ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-500 border-slate-800 hover:border-slate-700'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {members.map((m) => (
                      <button
                        key={m.user_id}
                        onClick={() => assignPlayer(idx, m.user_id)}
                        title={m.display_name || m.username}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all border-2 ${p.assignedUserId === m.user_id ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: m.color ?? '#6366f1' }}
                      >
                        {(m.display_name || m.username)[0]?.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {assigned && (
                    <p className="text-xs text-right mt-1" style={{ color: assigned.color }}>
                      {assigned.display_name || assigned.username}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep('upload')}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
        >
          Ulang
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
            : <><Check className="w-4 h-4" /> Simpan Match</>
          }
        </button>
      </div>
    </div>
  )
}
