"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatedCounter } from "@/components/AnimatedCounter"
import { VibeIcon, VibePill } from "@/components/VibeIcon"
import { EmptyState } from "@/components/EmptyState"
import { TimerBadge } from "@/components/TimerBadge"

const DEFAULT_FRIENDS = [
  { id: "u1", name: "Maya", tier: "inner_circle" },
  { id: "u2", name: "Jordan", tier: "friends" },
  { id: "u3", name: "Nia", tier: "acquaintances" },
  { id: "u4", name: "Leo", tier: "friends" },
  { id: "u5", name: "Rae", tier: "inner_circle" },
]

const TIERS = ["inner_circle", "friends", "acquaintances"]
const VIBES = ["drinks", "coffee", "food", "chill", "walk", "anything"]

export function ProfileDashboard({ userId }) {
  const [friends, setFriends] = useState(DEFAULT_FRIENDS)
  const [blurRadius, setBlurRadius] = useState(250)
  const [notifySignals, setNotifySignals] = useState(true)
  const [notifyChats, setNotifyChats] = useState(true)
  const [publicMode, setPublicMode] = useState(false)
  const [discoveryVibe, setDiscoveryVibe] = useState("drinks")
  const [discoveryRadius, setDiscoveryRadius] = useState(1)
  const [results, setResults] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [location, setLocation] = useState(null)
  
  const [mySignals, setMySignals] = useState([])
  const [loadingSignals, setLoadingSignals] = useState(true)

  useEffect(() => {
    async function fetchMySignals() {
      try {
        const res = await fetch(`/api/signals?userId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setMySignals((data.signals || []).filter(s => s.authorId === userId))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSignals(false)
      }
    }
    fetchMySignals()
  }, [userId])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setLocation({ lat: 40.7411, lng: -73.9897 }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  const groupedFriends = useMemo(
    () =>
      TIERS.reduce((acc, tier) => {
        acc[tier] = friends.filter((friend) => friend.tier === tier)
        return acc
      }, {}),
    [friends]
  )

  function moveFriend(friendId, tier) {
    setFriends((prev) => prev.map((friend) => (friend.id === friendId ? { ...friend, tier } : friend)))
  }

  async function runDiscovery() {
    if (!location) return
    setLoadingResults(true)
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lat: location.lat,
          lng: location.lng,
          vibe: discoveryVibe,
          radiusKm: discoveryRadius,
        }),
      })
      const data = await res.json()
      setResults(data.results || [])
    } finally {
      setLoadingResults(false)
    }
  }

  async function sayHi(targetId, signalId) {
    await fetch("/api/chat/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId, initiatorId: userId, targetId }),
    })
  }

  async function deleteSignal(signalId) {
    try {
      const res = await fetch(`/api/signals/${signalId}?userId=${userId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMySignals(prev => prev.filter(s => s.signalId !== signalId))
      }
    } catch (err) {
      console.error("Failed to delete signal", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile header with stats */}
      <section className="glass-card p-6 sm:p-7">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ember-400 to-amber-400 shadow-glow-ember" />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-night-900 bg-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Your profile</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Circles & settings</h1>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Friends" value={friends.length} />
          <StatCard label="Hangouts" value={12} />
          <StatCard label="Rating" value={4.9} suffix="/5" />
        </div>
      </section>

      {/* My Active Signals */}
      <section className="glass-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Broadcasts</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">My active signals</h2>
          </div>
          {mySignals.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {mySignals.length} Live
            </span>
          )}
        </div>

        {loadingSignals ? (
          <p className="text-sm text-slate-400">Loading signals...</p>
        ) : mySignals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {mySignals.map((signal) => (
              <div key={signal.signalId} className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                <div>
                  <div className="flex items-start justify-between">
                    <VibePill vibe={signal.vibe} />
                    <button
                      onClick={() => deleteSignal(signal.signalId)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Delete signal"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-white">{signal.isGhost ? "Ghost mode" : "Public profile visible"}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <p className="text-xs text-slate-400">Expires in</p>
                  <TimerBadge expiresAt={signal.expiresAt} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📡"
            title="No active signals"
            description="You haven't dropped any signals recently. Head to the Home page to broadcast."
          />
        )}
      </section>

      {/* Friend tiers */}
      <section className="glass-card p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Friend tiers</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">Drag between circles</h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <TierColumn key={tier} tier={tier} friends={groupedFriends[tier]} onMove={moveFriend} />
          ))}
        </div>
      </section>

      {/* Privacy & Notifications */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Privacy</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">Location blur</h2>
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-300">Blur radius</span>
              <span className="text-sm font-bold text-white tabular-nums">{blurRadius}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={blurRadius}
              onChange={(e) => setBlurRadius(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-3 text-xs text-slate-500">
              Signals reveal fuzzed proximity — never your exact location.
            </p>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Notifications</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">Preferences</h2>
          <div className="mt-4 space-y-2">
            <ToggleRow label="Friend signal alerts" icon="📡" checked={notifySignals} onChange={setNotifySignals} />
            <ToggleRow label="Chat invites" icon="💬" checked={notifyChats} onChange={setNotifyChats} />
            <ToggleRow label="Public discovery" icon="🌍" checked={publicMode} onChange={setPublicMode} />
          </div>
        </div>
      </section>

      {/* Discovery */}
      <section className="glass-card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">City layer</p>
        <h2 className="mt-1 font-display text-xl font-bold text-white">Public discovery</h2>

        <div className="mt-5 flex flex-wrap gap-3">
          {VIBES.map((v) => (
            <VibeIcon
              key={v}
              vibe={v}
              size="sm"
              showLabel
              selected={discoveryVibe === v}
              onClick={() => setDiscoveryVibe(v)}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <select
            value={discoveryRadius}
            onChange={(e) => setDiscoveryRadius(Number(e.target.value))}
            className="input-glow flex-1 !py-3"
          >
            {[1, 3, 5].map((r) => (
              <option key={r} value={r} className="bg-night-800">{r} km</option>
            ))}
          </select>
          <button
            type="button"
            onClick={runDiscovery}
            disabled={!publicMode || loadingResults || !location}
            className="btn-primary flex-1"
          >
            {loadingResults ? "Scanning..." : publicMode ? "Discover" : "Enable public mode"}
          </button>
        </div>

        {/* Results */}
        <div className="mt-5 space-y-3 stagger-children">
          {results.map((result) => (
            <article key={String(result.signalId)} className="glass-card !rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{result.displayName}</p>
                    {result.isIdVerified && (
                      <svg className="h-4 w-4 shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-1">{result.publicBio || "Open to a quick hello."}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <VibePill vibe={result.vibe} />
                    <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-xs text-slate-300">{result.distanceKm} km</span>
                    <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-xs text-slate-300">Match {result.matchScore}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sayHi(result.userId, result.signalId)}
                  className="btn-white !px-4 !py-2 !text-xs shrink-0"
                >
                  Say hi
                </button>
              </div>
            </article>
          ))}

          {results.length === 0 && publicMode && !loadingResults && (
            <EmptyState
              icon="🔍"
              title="No one nearby yet"
              description="Try expanding your radius or changing the vibe."
            />
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, suffix = "" }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
    </div>
  )
}

function TierColumn({ tier, friends, onMove }) {
  const titles = {
    inner_circle: "Inner Circle",
    friends: "Friends",
    acquaintances: "Acquaintances",
  }
  const icons = {
    inner_circle: "💎",
    friends: "🤝",
    acquaintances: "👋",
  }
  const [dragOver, setDragOver] = useState(false)

  function onDrop(event) {
    event.preventDefault()
    setDragOver(false)
    const friendId = event.dataTransfer.getData("text/plain")
    if (friendId) onMove(friendId, tier)
  }

  return (
    <div
      className={`min-h-[12rem] rounded-2xl border p-4 transition-all duration-300 ${
        dragOver
          ? "border-ember-400/40 bg-ember-500/10 scale-[1.01]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 mb-3">
        <span>{icons[tier]}</span>
        <h3 className="font-display text-sm font-bold text-white">{titles[tier]}</h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">
          {friends.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {friends.map((friend) => (
          <div
            key={friend.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", friend.id)}
            className="flex cursor-grab items-center gap-2.5 rounded-xl border border-white/[0.06] bg-night-800/60 px-3 py-2 transition-all duration-200 hover:bg-night-700/60 active:cursor-grabbing active:scale-[0.98]"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-300/60 to-rose-500/50" />
            <span className="text-sm text-slate-200 truncate">{friend.name}</span>
            <svg className="ml-auto h-4 w-4 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, icon, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-2.5">
        <span>{icon}</span>
        <span className="text-sm text-slate-200">{label}</span>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        className={`toggle-track ${checked ? "bg-emerald-400" : "bg-slate-600"}`}
      >
        <span className={`toggle-thumb ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </div>
    </button>
  )
}
