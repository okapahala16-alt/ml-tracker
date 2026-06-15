'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, Filter } from 'lucide-react'

type Season = { id: string; name: string; is_active: boolean }

interface Props {
  seasons:  Season[]
  selected: string
}

export default function SeasonFilter({ seasons, selected }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value === 'all') {
      params.delete('season')
    } else {
      params.set('season', e.target.value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="relative inline-flex items-center">
      <Filter className="absolute left-3 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
      <select
        value={selected}
        onChange={handleChange}
        className="appearance-none pl-8 pr-8 py-2 rounded-xl text-sm cursor-pointer transition-colors mythic-input"
      >
        <option value="all">Semua Waktu</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.is_active ? ' ✦' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
    </div>
  )
}
