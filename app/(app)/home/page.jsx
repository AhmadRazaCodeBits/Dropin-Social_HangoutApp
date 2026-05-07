"use client"

import { useEffect, useMemo, useState } from "react"
import { SignalBroadcaster } from "@/components/SignalBroadcaster"
import { TimerBadge } from "@/components/TimerBadge"
import { VibePill } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { EmptyState } from "@/components/EmptyState"
import { AnimatedCounter } from "@/components/AnimatedCounter"
import { getPusherClient } from "@/lib/pusher"
import Link from "next/link"
import { useRouter } from "next/navigation"


export default function HomePage() {
  const [me, setMe] = useState(null)
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBroadcaster, setShowBroadcaster] = useState(false)
  const router = useRouter()

  const handleDropIn = async (signal) => {
    if (!me) {
      router.push("/login")
      return
    }

    try {
      const res = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          signalId: signal._id, 
          initiatorId: me._id, 
          targetId: signal.authorId || signal.userId 
        }),
      })

      const data = await res.json()
      if (res.ok && data.roomId) {
        router.push(`/chat/${data.roomId}`)
      }
    } catch (err) {
      console.error("Failed to drop in:", err)
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMe(d.user)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!me) {
      setLoading(false)
      return
    }

    let alive = true

    async function loadSignals() {
      try {
        const res = await fetch(`/api/signals?userId=${me._id}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Signals request failed with ${res.status}`)
        const data = await res.json()
        const real = (data.signals || []).filter(s => String(s.authorId) !== String(me._id))
        if (alive) setSignals(real)
      } catch {
        if (alive) setSignals([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadSignals()

    const pusher = getPusherClient()
    const channels = [
      pusher?.subscribe(`signals-${me._id}`),
      pusher?.subscribe("signals-public")
    ]

    const handleNewSignal = (payload, channelName) => {
      // If it's a public signal, check if it's nearby
      if (channelName === "signals-public") {
        // In a real app we'd calculate distance here, but for the feed 
        // we'll just show it if it's not our own
        if (payload.userId === me._id) return
      }

      setSignals((prev) => {
        // Avoid adding duplicates if triggered on multiple channels
        if (prev.some(s => s._id === payload.signalId)) return prev;

        return [
          {
            _id: payload.signalId,
            userDisplayName: payload.isGhost ? "Ghost friend" : payload.displayName || "Friend",
            vibe: payload.vibe,
            expiresAt: payload.expiresAt,
            isGhost: payload.isGhost,
            userId: payload.userId,
          },
          ...prev,
        ]
      })
    }

    channels.forEach(channel => {
      channel?.bind("signal:new", (payload) => handleNewSignal(payload, channel.name))
    })

    return () => {
      alive = false
      channels.forEach(channel => {
        if (channel) {
          channel.unbind("signal:new")
          // We don't unsubscribe here to avoid breaking other components sharing the channel
        }
      })
    }
  }, [me])

  const incomingCount = useMemo(() => signals.length, [signals])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <HeroSection incomingCount={incomingCount} me={me} />

      {/* Main grid */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        {/* Left column */}
        <div className="space-y-6">
          {/* Signal Feed */}
          <section className="glass-card p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live signals</p>
                <h2 className="mt-1 font-display text-xl font-bold text-white">Friends nearby</h2>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 border border-white/[0.08]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <AnimatedCounter value={incomingCount} /> live
              </span>
            </div>

            {loading ? (
              <SkeletonLoader variant="signal" count={3} />
            ) : signals.length > 0 ? (
              <div className="space-y-2 stagger-children">
                {signals.map((signal) => (
                  <SignalCard key={signal._id} signal={signal} onDropIn={() => handleDropIn(signal)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="📡"
                title="No signals yet"
                description="Drop your own signal and wait for friends to join. It only takes 30 seconds."
                action={
                  me && (
                    <button
                      onClick={() => setShowBroadcaster(true)}
                      className="btn-primary"
                    >
                      Drop a signal
                    </button>
                  )
                }
              />
            )}
          </section>

          {/* About */}
          <section className="glass-card p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About DropIn</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">Built for right now</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              DropIn is designed for the moment you want to meet, not schedule. Share a vibe,
              see nearby friends, let AI suggest a place, and keep location privacy intact while ETAs update in real time.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: "⚡", label: "Instant", desc: "No scheduling" },
                { icon: "🤖", label: "AI spots", desc: "3 venue picks" },
                { icon: "🔒", label: "Private", desc: "Fuzzy location" },
                { icon: "🕒", label: "ETAs", desc: "Time not GPS" },
              ].map((feature) => (
                <div key={feature.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                  <span className="text-2xl">{feature.icon}</span>
                  <p className="mt-1 text-xs font-bold text-white">{feature.label}</p>
                  <p className="text-[10px] text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="space-y-6 lg:sticky lg:top-20">
          {/* Broadcaster */}
          <section className="glass-card overflow-hidden">
            <div className="border-b border-white/[0.06] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Broadcast</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-white">Drop a signal</h3>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {me ? (
                <SignalBroadcaster userId={me._id} />
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Log in to drop a signal</p>
              )}
            </div>
          </section>

          {/* Quick links */}
          <QuickActions me={me} />
        </aside>
      </section>

      {/* Floating broadcast button — mobile only */}
      <button
        onClick={() => setShowBroadcaster(true)}
        className="fixed bottom-28 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ember-500 to-amber-500 shadow-glow-ember transition-all hover:scale-105 active:scale-95 lg:hidden"
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Mobile broadcast modal */}
      {showBroadcaster && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowBroadcaster(false)}>
          <div className="w-full max-w-lg animate-slide-up rounded-t-4xl glass-strong p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h3 className="mb-4 font-display text-xl font-bold text-white">Drop a signal</h3>
            {me && (
              <SignalBroadcaster
                userId={me._id}
                onSignalCreated={() => setShowBroadcaster(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SignalCard({ signal, onDropIn }) {
  return (
    <article className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1]">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-300/80 to-rose-500/70 ring-2 ring-white/10 transition-all group-hover:ring-white/20" />
        {signal.isGhost && (
          <span className="absolute -bottom-0.5 -right-0.5 text-xs">👻</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{signal.userDisplayName || "Friend"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <VibePill vibe={signal.vibe} />
          <TimerBadge expiresAt={signal.expiresAt} />
        </div>
      </div>

      {/* Action */}
      <button 
        onClick={onDropIn}
        className="btn-white shrink-0 !px-4 !py-2 !text-xs opacity-0 transition-all duration-300 group-hover:opacity-100 sm:opacity-100"
      >
        Drop In
      </button>
    </article>
  )
}

function HeroSection({ incomingCount, me }) {
  return (
    <section className="relative overflow-hidden rounded-4xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 lg:p-10">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-ember-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Hang out in 30 seconds
          </span>

          <h1 className="mt-5 max-w-2xl font-display text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Drop a signal, find your people, and{" "}
            <span className="gradient-text">meet right now</span>.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            DropIn helps friends coordinate spontaneous meetups. Broadcast your vibe,
            see who is free, and lock in a spot with AI in seconds.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {!me ? (
              <>
                <Link href="/signup" className="btn-white">Sign up free</Link>
                <Link href="/login" className="btn-secondary">Log in</Link>
              </>
            ) : (
              <Link href="/profile/create" className="btn-white">Complete profile</Link>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="relative animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "No scheduling", value: "Instant", icon: "⚡" },
              { label: "AI venue picks", value: "3 spots", icon: "🤖" },
              { label: "Live ETAs", value: "Private GPS", icon: "🔒" },
              { label: "Signals now", value: incomingCount, icon: "📡", isNumber: true },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="glass-card !rounded-2xl p-4"
                style={{ animationDelay: `${300 + i * 100}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-white">
                  {stat.isNumber ? <AnimatedCounter value={stat.value} /> : stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function QuickActions({ me }) {
  return (
    <section className="glass-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quick actions</p>
      <div className="mt-3 space-y-2">
        {me ? (
          <>
            <QuickLink href="/radar" label="Open radar" icon="📍" />
            <QuickLink href="/journal" label="View journal" icon="📖" />
            <QuickLink href="/discover" label="Discover people" icon="🔍" />
            <QuickLink href="/profile" label="Edit profile" icon="⚙️" />
          </>
        ) : (
          <>
            <QuickLink href="/login" label="Log in" icon="🔑" />
            <QuickLink href="/signup" label="Create account" icon="✨" />
            <QuickLink href="/radar" label="Explore radar" icon="📍" />
          </>
        )}
      </div>
    </section>
  )
}

function QuickLink({ href, label, icon }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.1] group"
    >
      <span className="text-lg transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <svg className="ml-auto h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
