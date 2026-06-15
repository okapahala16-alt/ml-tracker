'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/ui/AuthCard'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

type FormState = {
  username: string
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL: FormState = {
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function validate(form: FormState): string | null {
  if (!USERNAME_RE.test(form.username)) {
    return 'Username harus 3–20 karakter: huruf, angka, dan underscore saja.'
  }
  if (form.password.length < 6) {
    return 'Password minimal 6 karakter.'
  }
  if (form.password !== form.confirmPassword) {
    return 'Password tidak cocok.'
  }
  return null
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    // Check username availability against existing profiles
    const { data: taken } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', form.username)
      .maybeSingle()

    if (taken) {
      setError('Username sudah dipakai. Coba username lain.')
      setIsLoading(false)
      return
    }

    // Sign up — trigger handle_new_user() auto-creates the profile row
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username.toLowerCase(),
          display_name: form.displayName.trim() || form.username,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation disabled — user is immediately logged in
      router.push('/dashboard')
      router.refresh()
    } else {
      // Email confirmation required
      setEmailSent(true)
      setIsLoading(false)
    }
  }

  /* ── Email confirmation screen ─────────────────────────── */
  if (emailSent) {
    return (
      <AuthCard title="Cek email kamu" subtitle="Satu langkah lagi">
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-300 text-sm">
              Link konfirmasi telah dikirim ke
            </p>
            <p className="text-white font-semibold">{form.email}</p>
            <p className="text-slate-400 text-sm">
              Klik link di email untuk mengaktifkan akunmu.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            ← Kembali ke login
          </Link>
        </div>
      </AuthCard>
    )
  }

  /* ── Registration form ─────────────────────────────────── */
  return (
    <AuthCard title="Buat akun" subtitle="Mulai catat hasil pertandinganmu">
      <form onSubmit={handleRegister} className="space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Username + Display name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={field('username')}
              placeholder="hero_123"
              required
              autoComplete="username"
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-300">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={field('displayName')}
              placeholder="Hero Player"
              autoComplete="nickname"
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Username hint */}
        <p className="flex items-center gap-1.5 text-xs text-slate-500 -mt-1">
          <Info className="w-3 h-3 shrink-0" />
          3–20 karakter · huruf, angka, underscore saja
        </p>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={field('email')}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={field('password')}
              placeholder="Min. 6 characters"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-11 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
            Konfirmasi password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={field('confirmPassword')}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-11 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200 flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Buat Akun
            </>
          )}
        </button>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-400 pt-1">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Masuk
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
