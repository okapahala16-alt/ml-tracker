'use client'

import { useRef, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  PlusCircle, CheckCircle2, XCircle, PlayCircle, Calendar,
  Hash, ChevronDown, ChevronUp, AlertTriangle, Loader2,
} from 'lucide-react'
import { createSeason, setActiveSeason, closeSeason } from './actions'
import type { Season } from './page'

interface Props {
  seasons:        Season[]
  hasActiveSeason: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null
  return format(new Date(d), 'dd MMM yyyy', { locale: idLocale })
}

function seasonStatus(s: Season): 'active' | 'closed' | 'inactive' {
  if (s.is_active) return 'active'
  const today = new Date().toISOString().slice(0, 10)
  if (s.end_date && s.end_date <= today) return 'closed'
  return 'inactive'
}

const STATUS_BADGE: Record<string, string> = {
  active:   'text-green-400  bg-green-500/10  border-green-500/20',
  closed:   'text-slate-500  bg-slate-800/40  border-slate-700/20',
  inactive: 'text-slate-400  bg-slate-800/30  border-slate-700/30',
}
const STATUS_LABEL: Record<string, string> = {
  active:   'Aktif',
  closed:   'Selesai',
  inactive: 'Tidak Aktif',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SeasonsClient({ seasons, hasActiveSeason }: Props) {
  const [showForm,    setShowForm]    = useState(false)
  const [msg,         setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition]  = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function notify(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createSeason(fd)
      if (res?.error) {
        notify('err', res.error)
      } else {
        notify('ok', 'Season berhasil dibuat!')
        setShowForm(false)
        formRef.current?.reset()
      }
    })
  }

  function handleSetActive(s: Season) {
    if (!confirm(`Aktifkan "${s.name}"?\nSemua season lain akan dinonaktifkan.`)) return
    startTransition(async () => {
      const res = await setActiveSeason(s.id)
      if (res?.error) notify('err', res.error)
      else notify('ok', `"${s.name}" sekarang aktif.`)
    })
  }

  function handleClose(s: Season) {
    if (!confirm(`Tutup "${s.name}"?\nTanggal selesai akan diset ke hari ini dan season dinonaktifkan.`)) return
    startTransition(async () => {
      const res = await closeSeason(s.id)
      if (res?.error) notify('err', res.error)
      else notify('ok', `"${s.name}" berhasil ditutup.`)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Inline feedback */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === 'ok'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10  border-red-500/20  text-red-400'
        }`}>
          {msg.type === 'ok'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle      className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* No-active-season warning (for admin view) */}
      {!hasActiveSeason && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Belum ada season aktif. Buat season baru atau aktifkan salah satu season di bawah.</span>
        </div>
      )}

      {/* ── Create form ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <PlusCircle className="w-4 h-4 text-blue-400" />
            Buat Season Baru
          </span>
          {showForm
            ? <ChevronUp   className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleCreate}
            className="px-5 pb-5 space-y-4 border-t border-slate-800"
          >
            {/* Name */}
            <div className="pt-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nama Season <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                type="text"
                required
                maxLength={80}
                placeholder='contoh: "Season 28 - Mythic Rise"'
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tanggal Mulai <span className="text-red-400">*</span>
                </label>
                <input
                  name="start_date"
                  type="date"
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tanggal Selesai
                  <span className="ml-1 text-slate-600 font-normal">(opsional)</span>
                </label>
                <input
                  name="end_date"
                  type="date"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Activate now */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                name="activate_now"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Aktifkan sekarang
                <span className="ml-1.5 text-xs text-slate-500">(akan menonaktifkan season lain)</span>
              </span>
            </label>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…</>
                  : <><PlusCircle className="w-4 h-4" /> Buat Season</>}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); formRef.current?.reset() }}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Season list ── */}
      <div>
        <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Semua Season ({seasons.length})
        </h2>

        {seasons.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <Calendar className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Belum ada season. Buat season pertama di atas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seasons.map((s) => {
              const status  = seasonStatus(s)
              const isClosed = status === 'closed'

              return (
                <div
                  key={s.id}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-colors ${
                    status === 'active'
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-white">{s.name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(s.start_date) ?? '—'}
                          {' → '}
                          {fmtDate(s.end_date) ?? <span className="text-slate-600 italic">belum ditentukan</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {s.matchCount} match
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    {!isClosed && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!s.is_active && (
                          <button
                            onClick={() => handleSetActive(s)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Set Aktif
                          </button>
                        )}
                        <button
                          onClick={() => handleClose(s)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Tutup Season
                        </button>
                      </div>
                    )}

                    {isClosed && (
                      <span className="text-xs text-slate-600 italic shrink-0 self-center">
                        Selesai — tidak bisa diubah
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
