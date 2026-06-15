import type { Metadata } from 'next'
import { Orbitron, Rajdhani, Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-orbitron',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ML Tracker',
    template: '%s | ML Tracker',
  },
  description: 'Track your Mobile Legends ranked journey',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: { username: string; display_name: string | null; color: string } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, color')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const isAuthenticated = !!user && !!profile

  return (
    <html lang="id">
      <body className={`${orbitron.variable} ${rajdhani.variable} ${inter.variable} antialiased`}
        style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
      >
        {isAuthenticated && (
          <Navbar
            username={profile!.username}
            displayName={profile!.display_name || profile!.username}
            color={profile!.color ?? '#6366f1'}
          />
        )}

        <div className="flex">
          {isAuthenticated && <Sidebar />}

          <main className="flex-1 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
