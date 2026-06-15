'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, Menu, X, LogOut, LayoutDashboard, PlusCircle, Trophy, CalendarDays, History, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  username: string
  displayName: string
  color: string
}

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/match/new',   label: 'Input Match', icon: PlusCircle      },
  { href: '/matches',     label: 'Riwayat',     icon: History         },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy          },
  { href: '/squad',       label: 'Squad',       icon: Users           },
  { href: '/seasons',     label: 'Seasons',     icon: CalendarDays    },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Navbar({ username, displayName, color }: NavbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (displayName || username)[0]?.toUpperCase() ?? '?'

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)' }}>
              <Shield className="w-5 h-5 text-white" fill="rgba(255,255,255,0.15)" />
            </div>
            <span
              className="text-lg font-black tracking-widest"
              style={{
                fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
                background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ML TRACKER
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative px-4 py-2 rounded-lg text-sm font-semibold tracking-wide uppercase transition-colors"
                  style={{
                    fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                    letterSpacing: '0.05em',
                    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#4F8EF7,#7C3AED)' }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors gradient-border hover:border-glow"
              style={{ background: 'var(--bg-card)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                {initial}
              </div>
              <div className="leading-none">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-inter)' }}>
                  {displayName}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>@{username}</p>
              </div>
              <Settings className="w-3.5 h-3.5 ml-1" style={{ color: 'var(--text-muted)' }} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5"
              style={{
                fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border)',
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t" style={{ background: 'rgba(10,10,15,0.98)', borderColor: 'var(--border)' }}>
          <div className="px-4 pt-3 pb-2 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wide transition-colors"
                  style={{
                    fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif',
                    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    background: active ? 'rgba(79,142,247,0.08)' : 'transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: color }}>
                {initial}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{username}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              style={{ fontFamily: 'var(--font-rajdhani)' }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
