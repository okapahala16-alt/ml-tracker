export default function MatchesLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-800 rounded-xl" />
        <div className="h-9 w-36 bg-slate-800 rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="h-3 w-16 bg-slate-800 rounded mb-3" />
            <div className="h-8 w-12 bg-slate-700 rounded" />
          </div>
        ))}
      </div>

      {/* Match list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* List header */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="h-4 w-32 bg-slate-800 rounded" />
        </div>
        <div className="divide-y divide-slate-800/50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
              <div className="w-24 h-3 bg-slate-800 rounded hidden sm:block shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-slate-800 rounded" />
                <div className="h-2.5 w-24 bg-slate-800/60 rounded" />
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <div className="h-3 w-16 bg-slate-800 rounded ml-auto" />
                <div className="h-2.5 w-12 bg-slate-800/60 rounded ml-auto" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
