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
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleSort(opt.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            letterSpacing: '0.04em',
            background: current === opt.value
              ? 'linear-gradient(135deg, rgba(79,142,247,0.15), rgba(124,58,237,0.1))'
              : 'transparent',
            border: current === opt.value ? '1px solid rgba(79,142,247,0.2)' : '1px solid transparent',
            color: current === opt.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
