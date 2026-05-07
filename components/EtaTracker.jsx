"use client"

import { useEffect, useMemo, useState } from "react"
import { getPusherClient } from "@/lib/pusher"

export function EtaTracker({ hangoutId, currentUserId, initialMembers, onAllArrivedChange }) {
  const [members, setMembers] = useState(initialMembers || [])
  const [arriveLoading, setArriveLoading] = useState(false)
  const [arriveError, setArriveError] = useState("")

  useEffect(() => {
    setMembers(initialMembers || [])
  }, [initialMembers])

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher || !hangoutId) return

    const channel = pusher.subscribe(`eta-${hangoutId}`)

    channel.bind("eta:update", (payload) => {
      setMembers((prev) =>
        prev.map((member) =>
          member.userId === payload.userId
            ? { ...member, etaMinutes: payload.etaMinutes, arrived: Boolean(payload.arrived) }
            : member
        )
      )
    })

    channel.bind("hangout:ended", () => {
      setArriveLoading(false)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`eta-${hangoutId}`)
    }
  }, [hangoutId])

  // 30s geolocation ping loop
  useEffect(() => {
    const me = members.find((m) => m.userId === currentUserId)
    if (!me || me.arrived || !hangoutId) return

    const pingLoop = setInterval(() => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await fetch("/api/eta/ping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                hangoutId,
                userId: currentUserId,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }),
            })
          } catch (err) {
            console.error("Ping failed:", err)
          }
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }, 30000)

    return () => clearInterval(pingLoop)
  }, [members, currentUserId, hangoutId])

  const allArrived = useMemo(() => members.length > 0 && members.every((m) => m.arrived), [members])
  const arrivedCount = useMemo(() => members.filter((m) => m.arrived).length, [members])

  useEffect(() => {
    if (onAllArrivedChange) onAllArrivedChange(allArrived)
  }, [allArrived, onAllArrivedChange])

  async function markArrived() {
    setArriveError("")
    setArriveLoading(true)

    try {
      const res = await fetch("/api/eta/arrived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hangoutId, userId: currentUserId }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to mark arrival")

      setMembers((prev) =>
        prev.map((member) =>
          member.userId === currentUserId ? { ...member, etaMinutes: 0, arrived: true } : member
        )
      )
    } catch (error) {
      setArriveError(error.message || "Unable to update arrival")
    } finally {
      setArriveLoading(false)
    }
  }

  const me = members.find((m) => m.userId === currentUserId)

  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-white">Who is coming</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {arrivedCount}/{members.length} arrived
          </p>
        </div>

        {/* Arrival progress ring */}
        <div className="relative h-12 w-12">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
            <circle
              cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - (members.length > 0 ? arrivedCount / members.length : 0))}
              strokeLinecap="round"
              className="text-emerald-400 transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {arrivedCount}
          </span>
        </div>
      </div>

      {/* Member list */}
      <ul className="space-y-2">
        {members.map((member, index) => {
          const isMe = member.userId === currentUserId
          return (
            <li
              key={member.userId}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-300 hover:bg-white/[0.05]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br ${member.arrived ? "from-emerald-300 to-green-500" : "from-amber-300/80 to-rose-500/70"} ring-2 ${member.arrived ? "ring-emerald-400/40" : "ring-white/10"} transition-all duration-500`}>
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                {member.arrived && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[8px] text-white animate-bounce-in">
                    ✓
                  </span>
                )}
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {isMe ? "You" : member.displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {member.arrived ? "At the spot" : "En route"}
                </p>
              </div>

              {/* ETA badge */}
              <div className={`rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all duration-500 ${
                member.arrived
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
                  : "bg-white/[0.06] text-slate-200 border border-white/[0.08]"
              }`}>
                {member.arrived ? (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Here
                  </span>
                ) : (
                  `${member.etaMinutes ?? "?"} min`
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* I'm here button */}
      {!me?.arrived && (
        <button
          type="button"
          onClick={markArrived}
          disabled={arriveLoading}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3.5 font-display text-sm font-bold text-white shadow-glow-teal transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {arriveLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              I am here
            </span>
          )}
        </button>
      )}

      {arriveError && <p className="mt-3 text-sm text-red-400 text-center animate-fade-in">{arriveError}</p>}
    </section>
  )
}
