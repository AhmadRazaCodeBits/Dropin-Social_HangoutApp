"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { EtaTracker } from "@/components/EtaTracker"
import { VibePill } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"

const DEMO_USER_ID = "661111111111111111111111"

export default function HangoutPage() {
  const params = useParams()
  const hangoutId = params?.id

  const [hangout, setHangout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [ending, setEnding] = useState(false)
  const [allArrived, setAllArrived] = useState(false)

  const loadHangout = useCallback(async () => {
    if (!hangoutId) return
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`/api/hangout/${hangoutId}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load hangout")
      setHangout(data.hangout)
    } catch (err) {
      setError(err.message || "Could not load hangout")
    } finally {
      setLoading(false)
    }
  }, [hangoutId])

  useEffect(() => {
    void loadHangout()
  }, [loadHangout])

  async function endHangout() {
    if (!hangout) return
    setEnding(true)
    setError("")

    try {
      const memoryRes = await fetch("/api/ai-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: hangout.venue,
          members: hangout.members,
          vibe: hangout.vibe,
          durationMinutes: hangout.durationMinutes || 45,
        }),
      })
      const memoryData = await memoryRes.json()
      if (!memoryRes.ok) throw new Error(memoryData.error || "Memory generation failed")

      const patchRes = await fetch(`/api/hangout/${hangout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended: true, aiMemory: memoryData.memory }),
      })
      const patchData = await patchRes.json()
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to end hangout")

      setHangout((prev) => ({
        ...prev,
        endedAt: patchData.hangout.endedAt,
        aiMemory: patchData.hangout.aiMemory,
      }))
    } catch (err) {
      setError(err.message || "Unable to end hangout")
    } finally {
      setEnding(false)
    }
  }

  const mapLink = useMemo(() => {
    if (!hangout?.venue?.name && !hangout?.venue?.address) return "#"
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${hangout.venue.name || ""} ${hangout.venue.address || ""}`
    )}`
  }, [hangout])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error && !hangout) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-2xl">
            ⚠️
          </div>
          <h2 className="font-display text-xl font-bold text-white">Cannot load hangout</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button onClick={loadHangout} className="btn-secondary mt-5">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-2 sm:px-6">
      {/* Celebration */}
      {allArrived && <CelebrationBanner />}

      {/* Progress Steps */}
      <ProgressSteps hangout={hangout} allArrived={allArrived} />

      {/* Venue card */}
      <section className="glass-card mt-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Meeting spot</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl truncate">
              {hangout.venue?.name || "Your hangout spot"}
            </h1>
            <p className="mt-2 text-sm text-slate-400 truncate">{hangout.venue?.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hangout.vibe && <VibePill vibe={hangout.vibe} />}
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Maps
              </a>
            </div>
          </div>

          {/* SOS */}
          <a
            href="tel:911"
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-400/20 transition-all hover:bg-red-500/25"
            title="Emergency SOS"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
        </div>
      </section>

      {/* AI Reason */}
      {hangout.aiReason && (
        <section className="mt-3 rounded-2xl bg-gradient-to-r from-indigo-600/80 to-violet-600/80 p-4 sm:p-5 border border-indigo-400/20 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">AI recommendation</p>
              <p className="mt-1 text-sm leading-relaxed text-white/90">{hangout.aiReason}</p>
            </div>
          </div>
        </section>
      )}

      {/* ETA Tracker */}
      <div className="mt-4">
        <EtaTracker
          hangoutId={hangout.id}
          currentUserId={DEMO_USER_ID}
          initialMembers={hangout.members || []}
          onAllArrivedChange={setAllArrived}
        />
      </div>

      {/* Memory card */}
      {hangout.aiMemory && (
        <section className="mt-4 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Memory card</p>
              <p className="mt-2 text-sm italic leading-relaxed text-amber-100/90">{hangout.aiMemory}</p>
            </div>
          </div>
        </section>
      )}

      {/* End hangout */}
      <button
        type="button"
        onClick={endHangout}
        disabled={ending || Boolean(hangout.endedAt)}
        className="btn-danger mt-5 w-full !py-3.5 !text-base"
      >
        {hangout.endedAt ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Hangout ended
          </span>
        ) : ending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Ending & generating memory...
          </span>
        ) : "End hangout"}
      </button>

      {error && <p className="mt-3 text-center text-sm text-red-400 animate-fade-in">{error}</p>}
    </div>
  )
}

function ProgressSteps({ hangout, allArrived }) {
  const steps = [
    { label: "Matched", done: true },
    { label: "En route", done: true },
    { label: "Arrived", done: allArrived },
    { label: "Hanging out", done: Boolean(hangout?.endedAt) },
  ]

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-0">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
              step.done
                ? "bg-emerald-400 text-night-900 shadow-glow-teal scale-100"
                : "border border-white/20 bg-white/5 text-slate-500 scale-90"
            }`}>
              {step.done ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-[10px] font-semibold ${step.done ? "text-emerald-300" : "text-slate-600"}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 w-6 rounded-full transition-all duration-500 sm:w-12 ${step.done ? "bg-emerald-400/60" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function CelebrationBanner() {
  return (
    <section className="relative mb-2 overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500/15 to-green-500/15 p-4 animate-bounce-in">
      {/* Confetti-like particles */}
      <div className="absolute -right-4 -top-4 h-20 w-20 animate-ping rounded-full bg-emerald-400/20" />
      <div className="absolute -left-4 -bottom-4 h-16 w-16 animate-ping rounded-full bg-green-400/15" style={{ animationDelay: "0.5s" }} />
      <div className="flex items-center gap-3 relative">
        <span className="text-2xl animate-bounce">🎉</span>
        <div>
          <h2 className="font-display text-lg font-bold text-emerald-100">Everyone made it!</h2>
          <p className="text-sm text-emerald-200/80">The circle is complete. Make this one count.</p>
        </div>
      </div>
    </section>
  )
}
