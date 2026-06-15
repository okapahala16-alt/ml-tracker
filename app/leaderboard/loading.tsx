export default function LeaderboardLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto animate-pulse">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-slate-800 rounded" />
          <div className="h-4 w-48 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-800 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-32 bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Category cards */}
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="w-6 h-6 bg-slate-800 rounded" />
              <div className="h-4 w-36 bg-slate-800 rounded" />
            </div>
            {/* Podium skeleton */}
            <div className="flex items-end justify-center gap-4 p-6 pb-0">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800" />
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="w-24 h-20 bg-slate-800 rounded-t-xl" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800" />
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="w-24 h-28 bg-slate-800 rounded-t-xl" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800" />
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="w-24 h-14 bg-slate-800 rounded-t-xl" />
              </div>
            </div>
            {/* List skeleton */}
            <div className="px-4 py-4 space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="w-5 h-3 bg-slate-800 rounded" />
                  <div className="w-7 h-7 rounded-full bg-slate-800" />
                  <div className="flex-1 h-3 bg-slate-800 rounded" />
                  <div className="w-12 h-3 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
