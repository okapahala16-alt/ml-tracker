import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'
import SeasonsClient from './SeasonsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Manajemen Season' }

export type Season = {
  id:         string
  name:       string
  start_date: string
  end_date:   string | null
  is_active:  boolean
  matchCount: number
}

export default async function SeasonsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard?error=access_denied')

  // Fetch all seasons with match counts
  const { data: rawSeasons } = await supabase
    .from('seasons')
    .select(`
      id, name, start_date, end_date, is_active,
      matches ( id )
    `)
    .order('start_date', { ascending: false })

  const seasons: Season[] = (rawSeasons ?? []).map((s) => ({
    id:         s.id,
    name:       s.name,
    start_date: s.start_date,
    end_date:   s.end_date,
    is_active:  s.is_active,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchCount: Array.isArray((s as any).matches) ? (s as any).matches.length : 0,
  }))

  const activeCount = seasons.filter((s) => s.is_active).length

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-5 h-5 text-slate-400" />
        <h1 className="text-2xl font-bold text-white">Manajemen Season</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        Logged in sebagai admin{' '}
        <span className="text-slate-300 font-medium">@{profile.username}</span>
      </p>

      <SeasonsClient seasons={seasons} hasActiveSeason={activeCount > 0} />
    </div>
  )
}
