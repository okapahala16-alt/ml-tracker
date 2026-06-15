export default function NewMatchLoading() {
  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="space-y-1 mb-8">
        <div className="h-8 w-48 bg-slate-800 rounded-xl" />
        <div className="h-4 w-64 bg-slate-800/60 rounded" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Match info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-4">
          <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
          {/* Player rows */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 lg:hidden">
                <div className="h-10 bg-slate-800 rounded-xl" />
                <div className="h-10 bg-slate-800 rounded-xl" />
                <div className="col-span-2 grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-10 bg-slate-800 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <div className="h-11 w-36 bg-slate-700 rounded-xl" />
          <div className="h-11 w-20 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
