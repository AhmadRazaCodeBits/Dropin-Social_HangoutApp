"use client"

import { useEffect, useState } from "react"
import { VibePill } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { EmptyState } from "@/components/EmptyState"
import Link from "next/link"

export default function JournalPage() {
  const [hangouts, setHangouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.ok) setMe(d.user) })
  }, [])

  useEffect(() => {
    if (!me) { setLoading(false); return }
    let alive = true

    async function loadJournal() {
      try {
        const res = await fetch(`/api/journal?userId=${me._id}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (alive) setHangouts(data.hangouts || [])
        }
      } catch {
        if (alive) setHangouts([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadJournal()
    return () => { alive = false }
  }, [me])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Your story</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Journal</h1>
        <p className="mt-2 text-sm text-slate-400">Every spontaneous hangout, captured with AI-generated memories.</p>
      </section>

      {loading ? (
        <SkeletonLoader variant="card" count={3} />
      ) : hangouts.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No memories yet"
          description="Your hangout memories will appear here after your first meetup."
          action={<Link href="/home" className="btn-primary">Drop a signal</Link>}
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-ember-400/20 to-transparent sm:left-6" />

          <div className="space-y-6 stagger-children">
            {hangouts.map((hangout, index) => (
              <MemoryCard key={hangout._id} hangout={hangout} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MemoryCard({ hangout, index }) {
  const date = new Date(hangout.createdAt)
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000)
  const daysText = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`

  return (
    <article className="relative pl-12 sm:pl-14">
      {/* Timeline dot */}
      <div className="absolute left-3.5 top-6 z-10 sm:left-4.5">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-night-900 ring-4 ring-night-900">
          <div className={`h-2.5 w-2.5 rounded-full ${
            index === 0 ? "bg-ember-400 shadow-glow-ember" : "bg-white/30"
          }`} />
        </div>
      </div>

      <div className="glass-card p-5 sm:p-6">
        {/* Date */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs text-slate-500">{formattedDate}</p>
          <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-[10px] text-slate-400">
            {daysText}
          </span>
        </div>

        {/* Venue */}
        <h3 className="font-display text-lg font-bold text-white">{hangout.venueName}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{hangout.venueAddress}</p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <VibePill vibe={hangout.vibe} />
          {hangout.members?.map((m, i) => (
            <span key={i} className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-xs text-slate-300">
              {m.displayName}
            </span>
          ))}
        </div>

        {/* Memory */}
        {hangout.aiMemory && (
          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2">
              <span className="text-sm">✨</span>
              <p className="text-sm italic leading-relaxed text-amber-100/80">{hangout.aiMemory}</p>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
