'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, Trophy,
  CalendarDays, Swords, History,
  ChevronLeft, ChevronRight, Users,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/match/new',   label: 'Input Match',   icon: PlusCircle      },
  { href: '/matches',     label: 'Riwayat Match', icon: History         },
  { href: '/leaderboard', label: 'Leaderboard',   icon: Trophy          },
  { href: '/squad',       label: 'Squad',         icon: Users           },
  { href: '/seasons',     label: 'Seasons',       icon: CalendarDays    },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname   = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  // Prevent layout shift on SSR
  const sidebarStyle = {
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
  }

  if (!mounted) return (
    <aside className="hidden lg:flex w-56 shrink-0 min-h-[calc(100vh-4rem)]" style={sidebarStyle} />
  )

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 min-h-[calc(100vh-4rem)] transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
      style={sidebarStyle}
    >
      {/* Toggle button */}
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} px-3 pt-4 pb-2`}>
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pb-2">
          <p className="section-label">Navigation</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`group flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
              }`}
              style={{
                fontFamily: 'var(--font-rajdhani)',
                letterSpacing: '0.04em',
                background: active
                  ? 'linear-gradient(135deg, rgba(79,142,247,0.12), rgba(124,58,237,0.08))'
                  : 'transparent',
                border: active
                  ? '1px solid rgba(79,142,247,0.18)'
                  : '1px solid transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              <Icon
                className={`shrink-0 transition-colors ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`}
                style={{ color: active ? 'var(--accent-blue)' : 'var(--text-muted)' }}
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)' }}
                    />
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div
        className={`py-5 ${collapsed ? 'flex justify-center' : 'px-4'}`}
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Swords className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs" style={{ fontFamily: 'var(--font-rajdhani)' }}>ML Tracker v1.0</span>}
        </div>
      </div>
    </aside>
  )
}
