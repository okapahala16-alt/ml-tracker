import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SquadUploadForm from './SquadUploadForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Upload Match Squad' }

export default async function SquadUploadPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('squad_sessions')
    .select('id, name, created_by')
    .eq('id', params.id)
    .single()

  if (!session) notFound()

  const isOwner = session.created_by === user.id
  const { data: membership } = await supabase
    .from('squad_members')
    .select('id')
    .eq('squad_session_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isOwner && !membership) redirect('/squad')

  // Fetch members
  const { data: members } = await supabase
    .from('squad_members')
    .select('user_id, profiles(display_name, username, color)')
    .eq('squad_session_id', params.id)

  // Fetch existing name mappings
  const { data: mappings } = await supabase
    .from('squad_name_mappings')
    .select('in_game_name, user_id')
    .eq('squad_session_id', params.id)

  // Fetch heroes
  const { data: heroes } = await supabase
    .from('heroes')
    .select('id, name, role')
    .order('name')

  const memberList = (members ?? []).map((m) => ({
    user_id: m.user_id,
    ...(m.profiles as unknown as { display_name: string | null; username: string; color: string }),
  }))

  const mappingMap: Record<string, string> = {}
  ;(mappings ?? []).forEach((mm) => { mappingMap[mm.in_game_name.toLowerCase()] = mm.user_id })

  return (
    <SquadUploadForm
      squadId={params.id}
      squadName={session.name}
      userId={user.id}
      members={memberList}
      existingMappings={mappingMap}
      heroes={heroes ?? []}
    />
  )
}
