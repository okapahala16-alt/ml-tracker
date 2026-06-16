import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'

export default async function JoinSquadPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = (searchParams.code ?? '').toUpperCase().trim()
  if (!code) redirect('/squad')

  // Look up the squad session by invite code.
  // NOTE: requires squad_sessions SELECT policy to allow any authenticated user
  // (see sql/fix-squad-join-rls.sql). Without that fix this query returns null
  // even for a valid code because RLS blocks non-members.
  const { data: session, error } = await supabase
    .from('squad_sessions')
    .select('id, name, invite_code')
    .eq('invite_code', code)
    .maybeSingle()

  // Invalid / not found — render error page instead of silent redirect
  if (!session) {
    return (
      <div className="p-5 lg:p-8 max-w-md mx-auto mt-16 text-center">
        <div className="card rounded-2xl p-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Users className="w-7 h-7" style={{ color: 'var(--loss)' }} />
          </div>
          <h2
            className="text-lg font-black mb-2"
            style={{ fontFamily: 'var(--font-orbitron)', color: 'var(--text-primary)' }}
          >
            KODE TIDAK VALID
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Squad dengan kode <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{code}</span> tidak ditemukan.
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Pastikan kode sudah benar. Kode bersifat case-insensitive.
          </p>
          <Link
            href="/squad"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
              color: '#fff',
            }}
          >
            Kembali ke Squad
          </Link>
        </div>
      </div>
    )
  }

  // Check already member — avoid duplicate insert
  const { data: existing } = await supabase
    .from('squad_members')
    .select('id')
    .eq('squad_session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('squad_members').insert({
      squad_session_id: session.id,
      user_id: user.id,
    })

    // If insert failed (e.g. duplicate race), still redirect — don't crash
    if (insertError && insertError.code !== '23505') {
      console.error('squad join insert error:', insertError)
    }
  }

  redirect(`/squad/${session.id}`)
}
