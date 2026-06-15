import { Shield } from 'lucide-react'

interface AuthCardProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-[#020209] flex items-center justify-center p-4">
      {/* Background glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/40 blur-xl rounded-full" />
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 shadow-lg shadow-blue-900/50">
                <Shield className="w-7 h-7 text-white" fill="rgba(255,255,255,0.15)" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">
                <span className="text-white">ML</span>
                <span className="ml-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Tracker
                </span>
              </h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Track your Mobile Legends ranked journey
          </p>
        </div>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-2xl" />
          <div className="relative bg-slate-900/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {subtitle && (
                <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
