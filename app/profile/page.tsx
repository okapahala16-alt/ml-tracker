import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Profil' }

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, color')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <ProfileForm
      userId={user.id}
      initialUsername={profile.username}
      initialDisplayName={profile.display_name ?? ''}
      color={profile.color ?? '#6366f1'}
    />
  )
}
