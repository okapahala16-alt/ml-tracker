'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Star, Shield, X, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────

export type Emblem = 'mvp' | 'gold' | 'silver' | 'bronze'
export type MatchResult = 'win' | 'loss'

export interface OverlayPlayer {
  username: string
  emblem:   Emblem
  result:   MatchResult
}

interface Props {
  players: OverlayPlayer[]
  onClose: () => void
}

// ── Messages ──────────────────────────────────────────────────

const MESSAGES: Record<Emblem, Record<MatchResult, string>> = {
  mvp: {
    win:  "CERTIFIED CARRY. The team didn't win — you dragged them across the finish line.",
    loss: "You did your part. Your team just couldn't keep up. Not your fault, carry harder next time.",
  },
  gold: {
    win:  "Clean performance. You showed up when it mattered.",
    loss: "You played your game. The result just didn't follow. Reset and run it back.",
  },
  silver: {
    win:  "A win's a win. But you and I both know you left something on the table.",
    loss: "Mid performance, mid result. Coincidence? I think not.",
  },
  bronze: {
    win:  "Congrats on the win. Your teammates worked hard to carry you there.",
    loss: "Were you even trying? Because it didn't look like it. Embarrassing.",
  },
}

const EMBLEM_CONFIG = {
  mvp:    { label: 'MVP',    color: '#FFD700', glow: 'rgba(255,215,0,0.7)'   },
  gold:   { label: 'GOLD',   color: '#FFB800', glow: 'rgba(255,184,0,0.5)'   },
  silver: { label: 'SILVER', color: '#C0C0C0', glow: 'rgba(192,192,192,0.5)' },
  bronze: { label: 'BRONZE', color: '#CD7F32', glow: 'rgba(205,127,50,0.5)'  },
}

// ── Emblem Shape ──────────────────────────────────────────────

function EmblemShape({ emblem }: { emblem: Emblem }) {
  const size = 120

  const iconProps = { size: 48, strokeWidth: 1.5, color: 'rgba(0,0,0,0.55)' }

  const shapes: Record<Emblem, React.ReactNode> = {
    mvp: (
      <div
        style={{
          width: size,
          height: size,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: 'linear-gradient(135deg, #FFE55C, #FFA500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Crown {...iconProps} />
      </div>
    ),
    gold: (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFE033, #FF8C00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Star {...iconProps} fill="rgba(0,0,0,0.35)" />
      </div>
    ),
    silver: (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8E8E8, #A8A8A8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Shield {...iconProps} fill="rgba(0,0,0,0.2)" />
      </div>
    ),
    bronze: (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #CD7F32, #7B3F00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X {...iconProps} strokeWidth={2.5} />
      </div>
    ),
  }

  return (
    <div
      style={{
        filter: `drop-shadow(0 0 20px ${EMBLEM_CONFIG[emblem].glow}) drop-shadow(0 0 40px ${EMBLEM_CONFIG[emblem].glow})`,
        width: size,
        height: size,
      }}
    >
      {shapes[emblem]}
    </div>
  )
}

// ── Background Particles (win only) ───────────────────────────

const PARTICLES = [
  { size: 4,  left: 8,  dur: 5.2, delay: 0   },
  { size: 6,  left: 18, dur: 6.1, delay: 1.2 },
  { size: 3,  left: 30, dur: 4.5, delay: 0.4 },
  { size: 5,  left: 42, dur: 7.0, delay: 2.1 },
  { size: 4,  left: 55, dur: 5.5, delay: 0.8 },
  { size: 7,  left: 65, dur: 6.3, delay: 1.6 },
  { size: 3,  left: 75, dur: 4.8, delay: 3.0 },
  { size: 5,  left: 85, dur: 5.8, delay: 0.2 },
  { size: 6,  left: 92, dur: 6.5, delay: 1.9 },
  { size: 4,  left: 23, dur: 7.2, delay: 2.5 },
  { size: 5,  left: 48, dur: 5.0, delay: 3.5 },
  { size: 3,  left: 70, dur: 6.8, delay: 1.0 },
]

function BackgroundEffect({ result }: { result: MatchResult }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: result === 'win'
            ? 'radial-gradient(ellipse at 50% 60%, rgba(34,197,94,0.09) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 50%, rgba(239,68,68,0.1) 0%, transparent 50%), radial-gradient(ellipse at 100% 50%, rgba(239,68,68,0.1) 0%, transparent 50%)',
        }}
      />
      {result === 'win' && PARTICLES.map((p) => (
        <motion.div
          key={p.left}
          style={{
            position: 'absolute',
            width:  p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#22c55e',
            opacity: 0,
            left:   `${p.left}%`,
            bottom: '-8px',
          }}
          animate={{ y: [-10, -900], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

// ── Main Overlay ──────────────────────────────────────────────

export default function MatchResultOverlay({ players, onClose }: Props) {
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState(0)

  const player   = players[idx]
  const isLast   = idx === players.length - 1
  const isFirst  = idx === 0
  const config   = EMBLEM_CONFIG[player.emblem]
  const message  = MESSAGES[player.emblem][player.result]

  function goNext() {
    if (!isLast) { setDirection(1); setIdx((i) => i + 1) }
    else onClose()
  }
  function goPrev() {
    if (!isFirst) { setDirection(-1); setIdx((i) => i - 1) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.87)', backdropFilter: 'blur(12px)' }}
    >
      <BackgroundEffect result={player.result} />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 flex flex-col items-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={idx}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* Username */}
            <motion.p
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-black text-white tracking-tight mb-8"
            >
              {player.username}
            </motion.p>

            {/* Emblem — drops from above */}
            <motion.div
              initial={{ y: -220, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 16,
                mass: 1.2,
                delay: 0.15,
              }}
              className="mb-5"
            >
              <EmblemShape emblem={player.emblem} />
            </motion.div>

            {/* Emblem label */}
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
              className="text-sm font-black tracking-[0.25em] mb-8"
              style={{ color: config.color }}
            >
              {config.label}
            </motion.p>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-slate-300 italic text-sm leading-relaxed max-w-[380px] px-2"
            >
              &ldquo;{message}&rdquo;
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        {players.length > 1 && (
          <div className="flex gap-2 mt-10">
            {players.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className={`flex gap-3 mt-8 ${players.length === 1 ? 'w-full max-w-xs' : ''}`}>
          {players.length > 1 && !isFirst && (
            <button
              onClick={goPrev}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
          )}
          <button
            onClick={goNext}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              isLast
                ? 'bg-white text-black hover:bg-slate-200 flex-1'
                : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600 flex-1'
            }`}
          >
            {isLast ? 'Close' : <>Next <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
