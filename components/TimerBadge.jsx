"use client"

import { useEffect, useState } from "react"

export function TimerBadge({ expiresAt }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  // Color transitions based on urgency
  const isUrgent = minutes < 5
  const isCritical = minutes < 2
  const colorClass = isCritical
    ? "bg-red-500/20 text-red-300 border-red-400/30"
    : isUrgent
      ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
      : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"

  if (secondsLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-400">
        Expired
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-500 ${colorClass} ${isUrgent ? "animate-pulse" : ""}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isCritical ? "animate-ping bg-red-400" : isUrgent ? "animate-ping bg-amber-400" : "bg-emerald-400"}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isCritical ? "bg-red-400" : isUrgent ? "bg-amber-400" : "bg-emerald-400"}`} />
      </span>
      {minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`}
    </span>
  )
}
