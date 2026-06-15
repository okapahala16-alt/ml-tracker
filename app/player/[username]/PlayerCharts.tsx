'use client'

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts'

export type WeeklyPoint = { week: string; winRate: number; total: number }
export type KdaPoint    = { label: string; kills: number; deaths: number; assists: number }

interface Props {
  weeklyData: WeeklyPoint[]
  kdaData:    KdaPoint[]
}

// ── Custom tooltips ───────────────────────────────────────────

function WinRateTip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || !payload.length) return null
  const d = payload[0] as { value: number; payload: { total: number } }
  return (
    <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl text-sm">
      <p className="text-slate-400 text-xs mb-1">{String(label)}</p>
      <p className="text-emerald-400 font-bold">{d.value}%</p>
      <p className="text-slate-500 text-xs">{d.payload.total} match</p>
    </div>
  )
}

function KdaTip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || !payload.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl text-sm">
      <p className="text-slate-400 text-xs mb-1.5">{String(label)}</p>
      {(payload as { name: string; value: number; color: string }[]).map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Shared axis style ─────────────────────────────────────────

const AXIS = {
  fill:   'rgba(255,255,255,0.35)',
  fontSize: 11,
}

export default function PlayerCharts({ weeklyData, kdaData }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">

      {/* Line chart — Win Rate per week */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-5">Win Rate per Minggu</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="week"
              tick={AXIS}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
            <Tooltip content={(p) => <WinRateTip {...p} />} />
            <Line
              type="monotone"
              dataKey="winRate"
              name="Win Rate"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={{ fill: '#34d399', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — KDA per last 5 matches */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-5">KDA — 5 Match Terakhir</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={kdaData}
            margin={{ top: 4, right: 8, left: -22, bottom: 0 }}
            barCategoryGap="28%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={AXIS}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={(p) => <KdaTip {...p} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'rgba(255,255,255,0.45)' }}
            />
            <Bar dataKey="kills"   name="Kills"   fill="#60a5fa" radius={[3, 3, 0, 0]} />
            <Bar dataKey="deaths"  name="Deaths"  fill="#f87171" radius={[3, 3, 0, 0]} />
            <Bar dataKey="assists" name="Assists" fill="#a78bfa" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
