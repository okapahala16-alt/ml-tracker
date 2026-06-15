'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/ui/AuthCard'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email or password is incorrect.'
          : error.message
      )
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthCard title="Selamat datang kembali" subtitle="Masuk ke akunmu untuk melanjutkan">
      <form onSubmit={handleLogin} className="space-y-5">

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--loss)' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold tracking-wide uppercase" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="mythic-input w-full px-4 py-3"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold tracking-wide uppercase" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="mythic-input w-full px-4 py-3 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mythic-btn-primary w-full py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Masuk
            </>
          )}
        </button>

        <p className="text-center text-sm pt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold transition-colors" style={{ color: 'var(--accent-blue)' }}>
            Daftar sekarang
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
