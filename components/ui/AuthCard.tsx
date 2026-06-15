import { Shield } from 'lucide-react'

interface AuthCardProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-60 -right-60 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 blur-2xl rounded-full" style={{ background: 'rgba(79,142,247,0.3)' }} />
            <div className="relative p-3.5 rounded-2xl" style={{ background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)' }}>
              <Shield className="w-8 h-8 text-white" fill="rgba(255,255,255,0.15)" />
            </div>
          </div>
          <h1
            className="text-3xl font-black tracking-widest mb-1"
            style={{
              fontFamily: 'var(--font-orbitron), Orbitron, sans-serif',
              background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ML TRACKER
          </h1>
          <p
            className="text-sm tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-rajdhani), Rajdhani, sans-serif', color: 'var(--text-secondary)', fontWeight: 600 }}
          >
            Track. Analyze. Dominate.
          </p>
        </div>

        {/* Card */}
        <div className="gradient-border rounded-2xl p-8" style={{ background: 'var(--bg-card)' }}>
          <div className="mb-6">
            <h2
              className="text-xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-orbitron), Orbitron, sans-serif', color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
