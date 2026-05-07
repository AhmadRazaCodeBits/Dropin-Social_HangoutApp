"use client"

export function SkeletonLoader({ variant = "card", count = 1, className = "" }) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((i) => (
          <div key={i} className="skeleton h-4 w-full rounded-lg" style={{ width: `${75 + Math.random() * 25}%` }} />
        ))}
      </div>
    )
  }

  if (variant === "avatar") {
    return (
      <div className={`flex gap-3 ${className}`}>
        {items.map((i) => (
          <div key={i} className="skeleton h-10 w-10 rounded-full" />
        ))}
      </div>
    )
  }

  if (variant === "signal") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-28 rounded-lg" />
              <div className="flex gap-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            </div>
            <div className="skeleton h-9 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "stats") {
    return (
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
        {items.map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="skeleton mb-2 h-3 w-16 rounded-lg" />
            <div className="skeleton h-7 w-12 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  // Default: card skeleton
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((i) => (
        <div key={i} className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="skeleton mb-3 h-4 w-24 rounded-lg" />
          <div className="skeleton mb-2 h-6 w-48 rounded-lg" />
          <div className="skeleton h-4 w-full rounded-lg" />
          <div className="skeleton mt-1 h-4 w-3/4 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
