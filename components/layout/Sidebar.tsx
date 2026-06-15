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
  if (!mounted) return (
    <aside className="hidden lg:flex w-56 shrink-0 min-h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-800" />
  )

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 min-h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Toggle button */}
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} px-3 pt-4 pb-2`}>
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Navigation
          </p>
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
              className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 border ${
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
              } ${
                active
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/10 text-blue-400 border-blue-500/25 shadow-sm shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
              }`}
            >
              <Icon
                className={`shrink-0 transition-colors ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} ${
                  active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className={`py-5 border-t border-slate-800/60 ${collapsed ? 'flex justify-center' : 'px-4'}`}>
        <div className="flex items-center gap-2 text-slate-600">
          <Swords className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs">ML Tracker v1.0</span>}
        </div>
      </div>
    </aside>
  )
}
