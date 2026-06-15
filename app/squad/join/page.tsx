import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: session } = await supabase
    .from('squad_sessions')
    .select('id, name')
    .eq('invite_code', code)
    .single()

  if (!session) redirect('/squad?error=invalid_code')

  // Check already member
  const { data: existing } = await supabase
    .from('squad_members')
    .select('id')
    .eq('squad_session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('squad_members').insert({
      squad_session_id: session.id,
      user_id: user.id,
    })
  }

  redirect(`/squad/${session.id}`)
}
