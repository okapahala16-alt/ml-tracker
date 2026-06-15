export default function DashboardLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-800 rounded" />
          <div className="h-8 w-52 bg-slate-800 rounded" />
          <div className="h-3 w-24 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
      </div>

      {/* Personal stats */}
      <div>
        <div className="h-3 w-40 bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-8 w-16 bg-slate-800 rounded" />
              <div className="h-2 w-24 bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Player cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-36 bg-slate-800 rounded" />
          <div className="h-8 w-44 bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-slate-800 rounded" />
                  <div className="h-3 w-16 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-5 w-16 bg-slate-800 rounded-full" />
                  <div className="h-5 w-10 bg-slate-800 rounded" />
                </div>
                <div className="h-1 bg-slate-800 rounded-full" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-14 bg-slate-800 rounded" />
                <div className="h-3 w-18 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: recent activity + quick stats */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="h-3 w-32 bg-slate-800 rounded m-5 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 border-t border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 bg-slate-800 rounded" />
                  <div className="h-2.5 w-36 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="h-3 w-32 bg-slate-800 rounded mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-24 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
