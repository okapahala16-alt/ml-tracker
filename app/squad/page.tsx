import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Plus, ChevronRight, Crown } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Squad' }

export default async function SquadPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const joinError = searchParams?.error === 'invalid_code'

  // Sessions where user is creator or member
  const { data: createdSessions } = await supabase
    .from('squad_sessions')
    .select('id, name, invite_code, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  const { data: joinedMemberships } = await supabase
    .from('squad_members')
    .select('squad_session_id, squad_sessions(id, name, invite_code, created_at)')
    .eq('user_id', user.id)

  const joinedSessions = (joinedMemberships ?? [])
    .map((m) => m.squad_sessions as unknown as { id: string; name: string; invite_code: string; created_at: string })
    .filter(Boolean)

  const createdIds = new Set((createdSessions ?? []).map((s) => s.id))
  const allSessions = [
    ...(createdSessions ?? []).map((s) => ({ ...s, isOwner: true })),
    ...joinedSessions.filter((s) => !createdIds.has(s.id)).map((s) => ({ ...s, isOwner: false })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Squad</h1>
          <p className="text-slate-400 text-sm mt-1">Analisa performa tim kamu</p>
        </div>
        <Link
          href="/squad/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Buat Squad
        </Link>
      </div>

      {allSessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Belum ada squad</h3>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Buat squad baru atau join lewat invite link dari temanmu.
          </p>
          <div className="flex gap-3">
            <Link
              href="/squad/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Buat Squad
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {allSessions.map((session) => (
            <Link
              key={session.id}
              href={`/squad/${session.id}`}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-5 py-4 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold truncate">{session.name}</p>
                  {session.isOwner && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kode: <span className="font-mono text-slate-400">{session.invite_code}</span>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Join by code */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-3">Punya invite code?</p>
        {joinError && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
            <span className="shrink-0">⚠️</span>
            Kode invite tidak valid atau sudah kadaluarsa. Coba cek lagi.
          </div>
        )}
        <JoinForm />
      </div>
    </div>
  )
}

function JoinForm() {
  return (
    <form action="/squad/join" method="GET" className="flex gap-3">
      <input
        name="code"
        placeholder="Masukkan kode..."
        maxLength={8}
        className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 font-mono tracking-wider uppercase"
      />
      <button
        type="submit"
        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Join
      </button>
    </form>
  )
}
