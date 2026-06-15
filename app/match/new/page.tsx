import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewMatchForm from './NewMatchForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Input Match' }

export default async function NewMatchPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [seasonResult, heroesResult] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('heroes')
      .select('id, name, role')
      .order('name'),
  ])

  return (
    <NewMatchForm
      season={seasonResult.data}
      heroes={heroesResult.data ?? []}
    />
  )
}
