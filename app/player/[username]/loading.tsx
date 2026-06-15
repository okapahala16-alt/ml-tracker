export default function PlayerProfileLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">

      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-36 bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-24 bg-slate-800/60 rounded" />
              <div className="flex gap-2 mt-1">
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
                <div className="h-5 w-20 bg-slate-800/60 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="h-9 w-36 bg-slate-800 rounded-xl" />
            <div className="flex gap-3">
              <div className="h-4 w-12 bg-slate-800 rounded" />
              <div className="h-4 w-12 bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}
          >
            <div className="h-3 w-16 bg-slate-800 rounded mb-3" />
            <div className="h-9 w-20 bg-slate-700 rounded-lg mb-3" />
            <div className="h-2 w-full bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
            <div className="h-36 bg-slate-800/40 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Hero stats table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>
        <div className="divide-y divide-slate-800/50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
                <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
              </div>
              <div className="hidden sm:flex gap-6">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 w-10 bg-slate-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
