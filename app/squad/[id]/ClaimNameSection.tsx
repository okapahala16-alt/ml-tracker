'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  squadId:    string
  userId:     string
  myMapping:  string | null // in-game name already claimed by this user
}

export default function ClaimNameSection({ squadId, userId, myMapping }: Props) {
  const [unassigned, setUnassigned] = useState<string[]>([])
  const [loading,    setLoading]    = useState(true)
  const [claiming,   setClaiming]   = useState<string | null>(null)
  const [claimed,    setClaimed]    = useState<string | null>(myMapping)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    async function fetchUnassigned() {
      const supabase = createClient()
      const { data: matches } = await supabase
        .from('squad_matches')
        .select('id')
        .eq('squad_session_id', squadId)

      const matchIds = (matches ?? []).map((m) => m.id)
      if (matchIds.length === 0) { setLoading(false); return }

      const { data: players } = await supabase
        .from('squad_match_players')
        .select('in_game_name, user_id')
        .in('squad_match_id', matchIds)

      // Unique names with no user_id assigned across all appearances
      const nameMap: Record<string, boolean> = {}
      ;(players ?? []).forEach((p) => {
        if (!nameMap[p.in_game_name]) nameMap[p.in_game_name] = true
        if (p.user_id) nameMap[p.in_game_name] = false // has at least one assigned → not fully unassigned
      })

      // Show names that appear unassigned at least once and aren't fully claimed
      const allNames = [...new Set((players ?? []).map((p) => p.in_game_name))]
      const unassignedNames = allNames.filter((name) => {
        const rows = (players ?? []).filter((p) => p.in_game_name === name)
        return rows.some((p) => !p.user_id)
      })

      setUnassigned(unassignedNames.sort())
      setLoading(false)
    }
    fetchUnassigned()
  }, [squadId])

  async function handleClaim(inGameName: string) {
    setClaiming(inGameName)
    setError(null)
    const supabase = createClient()

    // 1. Upsert name mapping
    const { error: mappingErr } = await supabase
      .from('squad_name_mappings')
      .upsert(
        { squad_session_id: squadId, in_game_name: inGameName, user_id: userId },
        { onConflict: 'squad_session_id,in_game_name' }
      )

    if (mappingErr) {
      setError('Gagal menyimpan mapping.')
      setClaiming(null)
      return
    }

    // 2. Update squad_match_players: assign user_id where name matches and unassigned
    await supabase
      .from('squad_match_players')
      .update({ user_id: userId })
      .eq('in_game_name', inGameName)
      .is('user_id', null)
      .in(
        'squad_match_id',
        (await supabase
          .from('squad_matches')
          .select('id')
          .eq('squad_session_id', squadId)
        ).data?.map((m) => m.id) ?? []
      )

    // 3. Sync historical matches to personal
    const { data: myPlayers } = await supabase
      .from('squad_match_players')
      .select('squad_match_id, hero_id, kills, deaths, assists, rating, squad_matches(result, match_date)')
      .eq('in_game_name', inGameName)
      .in(
        'squad_match_id',
        (await supabase
          .from('squad_matches')
          .select('id')
          .eq('squad_session_id', squadId)
        ).data?.map((m) => m.id) ?? []
      )

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    for (const mp of myPlayers ?? []) {
      const matchData = mp.squad_matches as unknown as { result: string; match_date: string } | null
      if (!matchData) continue

      const { data: personalMatch } = await supabase
        .from('matches')
        .insert({
          season_id:  activeSeason?.id ?? null,
          match_date: matchData.match_date,
          result:     matchData.result,
          created_by: userId,
        })
        .select('id')
        .single()

      if (personalMatch) {
        await supabase.from('match_players').insert({
          match_id: personalMatch.id,
          user_id:  userId,
          hero_id:  mp.hero_id,
          kills:    mp.kills,
          deaths:   mp.deaths,
          assists:  mp.assists,
          rating:   mp.rating,
        })
      }
    }

    setClaimed(inGameName)
    setUnassigned((prev) => prev.filter((n) => n !== inGameName))
    setClaiming(null)
  }

  if (loading) return null
  if (claimed) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <UserCheck className="w-4 h-4 text-green-400 shrink-0" />
        <div>
          <p className="text-sm text-white font-medium">Nama kamu: <span className="text-green-400">{claimed}</span></p>
          <p className="text-xs text-slate-500">Data historis sudah tersync ke profil personal kamu</p>
        </div>
      </div>
    )
  }

  if (unassigned.length === 0) return null

  return (
    <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Klaim Nama Kamu</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Pilih nama in-game kamu dari daftar di bawah. Semua data historis akan otomatis masuk ke profil personal kamu.
      </p>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <div className="space-y-2">
        {unassigned.map((name) => (
          <div key={name} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-800 rounded-xl">
            <span className="text-sm text-white font-medium truncate">{name}</span>
            <button
              onClick={() => handleClaim(name)}
              disabled={!!claiming}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {claiming === name
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Memproses...</>
                : <><Check className="w-3 h-3" /> Ini Saya</>
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
