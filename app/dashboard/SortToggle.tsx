'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const OPTIONS = [
  { value: 'winrate', label: 'Win Rate' },
  { value: 'kda',     label: 'KDA'      },
  { value: 'games',   label: 'Games'    },
]

export default function SortToggle({ current }: { current: string }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-800/80 border border-slate-700/50 rounded-xl">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSort(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            current === opt.value
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
