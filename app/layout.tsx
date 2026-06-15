import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
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

  let profile: { username: string; display_name: string | null } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const isAuthenticated = !!user && !!profile

  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
      >
        {isAuthenticated && (
          <Navbar
            username={profile!.username}
            displayName={profile!.display_name || profile!.username}
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
