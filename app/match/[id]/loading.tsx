export default function MatchDetailLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">

      {/* Back link + header */}
      <div className="space-y-4">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-40 bg-slate-800 rounded-lg" />
              <div className="flex gap-3">
                <div className="h-4 w-28 bg-slate-800/60 rounded" />
                <div className="h-4 w-20 bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="h-10 w-20 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Player cards */}
      <div className="space-y-3">
        <div className="h-4 w-28 bg-slate-800 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
              {/* Name + hero */}
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-slate-800/60 rounded" />
              </div>
              {/* Stats */}
              <div className="hidden sm:flex gap-6">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="text-center space-y-1">
                    <div className="h-5 w-8 bg-slate-800 rounded mx-auto" />
                    <div className="h-2.5 w-6 bg-slate-800/60 rounded mx-auto" />
                  </div>
                ))}
              </div>
              {/* Rating */}
              <div className="w-12 h-8 bg-slate-800 rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
