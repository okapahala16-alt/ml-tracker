'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getAdminClient() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard?error=access_denied')

  return supabase
}

function revalidateAll() {
  revalidatePath('/seasons')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')
  revalidatePath('/matches')
  revalidatePath('/match/new')
}

export async function createSeason(formData: FormData) {
  const supabase = await getAdminClient()

  const name      = (formData.get('name') as string)?.trim()
  const startDate = formData.get('start_date') as string
  const endDate   = (formData.get('end_date') as string) || null
  const activate  = formData.get('activate_now') === 'on'

  if (!name)      return { error: 'Nama season wajib diisi.' }
  if (!startDate) return { error: 'Tanggal mulai wajib diisi.' }

  if (activate) {
    await supabase.from('seasons').update({ is_active: false }).eq('is_active', true)
  }

  const { error } = await supabase.from('seasons').insert({
    name,
    start_date: startDate,
    end_date:   endDate,
    is_active:  activate,
  })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function setActiveSeason(seasonId: string) {
  const supabase = await getAdminClient()

  await supabase.from('seasons').update({ is_active: false }).neq('id', seasonId)

  const { error } = await supabase
    .from('seasons')
    .update({ is_active: true })
    .eq('id', seasonId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function closeSeason(seasonId: string) {
  const supabase = await getAdminClient()

  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('seasons')
    .update({ is_active: false, end_date: today })
    .eq('id', seasonId)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}
