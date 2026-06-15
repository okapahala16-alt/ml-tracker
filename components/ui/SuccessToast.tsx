'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface Props {
  message: string
}

export default function SuccessToast({ message }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Clean the ?success param from URL without triggering a navigation
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    window.history.replaceState({}, '', url.toString())

    const timer = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-green-600/40 rounded-2xl shadow-2xl shadow-black/40 max-w-sm">
      <div className="p-1 rounded-full bg-green-500/15">
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
      </div>
      <span className="text-sm font-medium text-white flex-1">{message}</span>
      <button
        onClick={() => setVisible(false)}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
