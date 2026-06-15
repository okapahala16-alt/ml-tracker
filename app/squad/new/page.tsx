import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewSquadForm from './NewSquadForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Buat Squad' }

export default async function NewSquadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <NewSquadForm userId={user.id} />
}
