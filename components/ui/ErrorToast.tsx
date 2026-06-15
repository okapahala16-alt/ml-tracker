'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { XCircle, X } from 'lucide-react'

interface Props {
  message: string
}

export default function ErrorToast({ message }: Props) {
  const [visible, setVisible] = useState(true)
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('error')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)

    const t = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(t)
  }, [pathname, searchParams, router])

  if (!visible) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 bg-red-950 border border-red-500/40 text-red-300 rounded-2xl shadow-2xl shadow-red-900/30 max-w-sm animate-in slide-in-from-bottom-2 duration-300">
      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => setVisible(false)}
        className="ml-1 text-red-500 hover:text-red-300 transition-colors shrink-0"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
