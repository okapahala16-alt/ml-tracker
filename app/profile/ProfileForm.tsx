'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, AtSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId:             string
  initialUsername:    string
  initialDisplayName: string
  color:              string
}

export default function ProfileForm({ userId, initialUsername, initialDisplayName, color }: Props) {
  const router = useRouter()

  const [username,    setUsername]    = useState(initialUsername)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [isSaving,    setIsSaving]    = useState(false)

  const usernameChanged    = username.trim() !== initialUsername
  const displayNameChanged = displayName.trim() !== initialDisplayName
  const hasChanges         = usernameChanged || displayNameChanged

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const trimmedUsername    = username.trim()
    const trimmedDisplayName = displayName.trim()

    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError('Username harus 3–20 karakter, hanya huruf, angka, dan underscore.')
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    // Check username uniqueness if changed
    if (usernameChanged) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', userId)
        .maybeSingle()

      if (existing) {
        setError('Username sudah dipakai orang lain.')
        setIsSaving(false)
        return
      }
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username:     trimmedUsername,
        display_name: trimmedDisplayName || null,
      })
      .eq('id', userId)

    if (updateErr) {
      setError(`Gagal menyimpan: ${updateErr.message}`)
      setIsSaving(false)
      return
    }

    setSuccess(true)
    setIsSaving(false)

    // Refresh to update navbar display name/username
    router.refresh()
  }

  return (
    <div className="p-5 lg:p-8 max-w-lg mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Edit Profil</h1>
        <p className="text-slate-400 text-sm mt-1">Ubah username dan nama tampilan</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-7">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0" style={{ backgroundColor: color }}>
          {(displayName || username)[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-white font-semibold">{displayName || username}</p>
          <p className="text-slate-500 text-sm">@{username}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Display Name */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Info Profil
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <User className="w-3.5 h-3.5" />
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama yang ditampilkan di leaderboard"
              maxLength={40}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
            <p className="text-xs text-slate-600">
              Kosongkan untuk menggunakan username sebagai nama tampilan
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <AtSign className="w-3.5 h-3.5" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              maxLength={20}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
            <p className="text-xs text-slate-600">
              3–20 karakter, hanya huruf, angka, dan underscore
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profil berhasil disimpan!
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              : <><CheckCircle2 className="w-4 h-4" /> Simpan Perubahan</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
