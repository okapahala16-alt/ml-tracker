'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewSquadForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: session, error: sessionErr } = await supabase
      .from('squad_sessions')
      .insert({ name: name.trim(), created_by: userId })
      .select('id')
      .single()

    if (sessionErr || !session) {
      setError('Gagal membuat squad.')
      setLoading(false)
      return
    }

    // Auto-join as member
    await supabase.from('squad_members').insert({
      squad_session_id: session.id,
      user_id: userId,
    })

    router.push(`/squad/${session.id}`)
  }

  return (
    <div className="p-5 lg:p-8 max-w-lg mx-auto">
      <Link
        href="/squad"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Squad
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Buat Squad</h1>
        <p className="text-slate-400 text-sm mt-1">Buat sesi squad baru untuk analisa performa tim</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/20 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <label className="block text-sm font-medium text-slate-300">Nama Squad</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="contoh: Tim Ngab, Squad Bocil..."
            maxLength={40}
            autoFocus
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
          />
          <p className="text-xs text-slate-600">
            Setelah dibuat, kamu akan dapat invite code untuk dibagikan ke anggota.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        <div className="flex gap-3">
          <Link
            href="/squad"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : 'Buat Squad'}
          </button>
        </div>
      </form>
    </div>
  )
}
