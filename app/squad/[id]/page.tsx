import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, Upload, Users, Copy, TrendingUp, TrendingDown } from 'lucide-react'
import type { Metadata } from 'next'
import SquadAnalytics from './SquadAnalytics'
import CopyButton from './CopyButton'
import DeleteSquadButton from './DeleteSquadButton'

export const metadata: Metadata = { title: 'Squad Detail' }

export default async function SquadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('squad_sessions')
    .select('id, name, invite_code, created_by, created_at')
    .eq('id', params.id)
    .single()

  if (!session) notFound()

  // Check access
  const isOwner = session.created_by === user.id
  const { data: membership } = await supabase
    .from('squad_members')
    .select('id')
    .eq('squad_session_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isOwner && !membership) redirect('/squad')

  // Auto-add current user as member if missing
  if (!membership) {
    await supabase.from('squad_members').upsert(
      { squad_session_id: params.id, user_id: user.id },
      { onConflict: 'squad_session_id,user_id' }
    )
  }

  // Fetch members with profiles
  const { data: members } = await supabase
    .from('squad_members')
    .select('user_id, profiles(display_name, username, color)')
    .eq('squad_session_id', params.id)

  // Fetch matches with players
  const { data: matches } = await supabase
    .from('squad_matches')
    .select(`
      id, result, match_date, created_at,
      squad_match_players(id, in_game_name, user_id, kills, deaths, assists, rating, heroes(name, role))
    `)
    .eq('squad_session_id', params.id)
    .order('created_at', { ascending: false })

  const memberList = (members ?? []).map((m) => ({
    user_id: m.user_id,
    ...(m.profiles as unknown as { display_name: string | null; username: string; color: string }),
  }))

  const matchList = (matches ?? []) as unknown as Array<{
    id: string
    result: 'win' | 'loss'
    match_date: string
    created_at: string
    squad_match_players: Array<{
      id: string
      in_game_name: string
      user_id: string | null
      kills: number
      deaths: number
      assists: number
      rating: number | null
      heroes: { name: string; role: string } | null
    }>
  }>

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mltracker-app.vercel.app'}/squad/join?code=${session.invite_code}`

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {/* Back + Delete */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/squad" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Squad
        </Link>
        {isOwner && <DeleteSquadButton squadId={params.id} />}
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{matchList.length} match dimainkan</p>
          </div>
          <Link
            href={`/squad/${params.id}/upload`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98] shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload Match
          </Link>
        </div>

        {/* Invite */}
        <div className="mt-5 pt-5 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Invite Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-300 bg-slate-800 px-3 py-2 rounded-lg truncate font-mono">
              {inviteUrl}
            </code>
            <CopyButton text={inviteUrl} />
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Kode: <span className="font-mono text-slate-400 font-bold tracking-wider">{session.invite_code}</span>
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-white text-sm">Anggota ({memberList.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {memberList.map((m) => (
            <Link
              key={m.user_id}
              href={`/squad/${params.id}/member/${m.user_id}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors group"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: m.color ?? '#6366f1' }}
              >
                {(m.display_name || m.username)[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-white group-hover:text-blue-400 transition-colors">{m.display_name || m.username}</span>
              {m.user_id === session.created_by && (
                <span className="text-[10px] text-yellow-400 font-bold">Owner</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics */}
      {matchList.length > 0 && (
        <SquadAnalytics matches={matchList} members={memberList} />
      )}

      {/* Match history */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Riwayat Match</h2>
        </div>
        {matchList.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Belum ada match. Upload screenshot pertama!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {matchList.map((m) => {
              const players = m.squad_match_players
              const teamK = players.reduce((s, p) => s + p.kills, 0)
              const teamD = players.reduce((s, p) => s + p.deaths, 0)
              const teamA = players.reduce((s, p) => s + p.assists, 0)
              return (
                <div key={m.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 font-bold text-sm w-20 shrink-0 ${m.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {m.result === 'win' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {m.result === 'win' ? 'MENANG' : 'KALAH'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {players.map((p) => {
                        const member = memberList.find((mm) => mm.user_id === p.user_id)
                        return (
                          <span
                            key={p.id}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: member ? `${member.color}22` : '#33415522',
                              color: member?.color ?? '#94a3b8',
                              border: `1px solid ${member?.color ?? '#334155'}44`,
                            }}
                          >
                            {member ? (member.display_name || member.username) : p.in_game_name}
                          </span>
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      KDA {teamK}/{teamD}/{teamA}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 shrink-0">
                    {new Date(m.match_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
