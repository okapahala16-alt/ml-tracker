'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, Menu, X, LogOut, LayoutDashboard, PlusCircle, Trophy, CalendarDays, History, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  username: string
  displayName: string
  color: string
}

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/match/new',   label: 'Input Match',  icon: PlusCircle      },
  { href: '/matches',     label: 'Riwayat',      icon: History         },
  { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy          },
  { href: '/squad',       label: 'Squad',        icon: Trophy          },
  { href: '/seasons',     label: 'Seasons',      icon: CalendarDays    },
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
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 shadow-md shadow-blue-900/40">
              <Shield className="w-5 h-5 text-white" fill="rgba(255,255,255,0.15)" />
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-white">ML</span>
              <span className="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Tracker
              </span>
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(pathname, href)
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Desktop right: user + logout ── */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors group"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color }}>
                {initial}
              </div>
              <div className="leading-none">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-[11px] text-slate-500">@{username}</p>
              </div>
              <Settings className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors ml-1" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98">
          <div className="px-4 pt-3 pb-2 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(pathname, href)
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile user row */}
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: color }}>
                {initial}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-slate-500">@{username} · Edit profil</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
