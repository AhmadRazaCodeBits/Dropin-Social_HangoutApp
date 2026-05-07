"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { VibeIcon, VibePill, getVibeConfig } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { EmptyState } from "@/components/EmptyState"

const VIBES = ["drinks", "chai", "coffee", "burger", "pizza", "food", "dessert", "chill", "walk", "anything"]

export default function DiscoverPage() {
  const [vibe, setVibe] = useState("anything")
  const [radius, setRadius] = useState(3)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [me, setMe] = useState(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMe(d.user)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 40.7411, lng: -73.9897 }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  async function search() {
    if (!location) return
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me?._id,
          lat: location.lat,
          lng: location.lng,
          vibe,
          radiusKm: radius,
        }),
      })
      const data = await res.json()
      const real = data.results || []
      setResults(real)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-search when location is first acquired
  useEffect(() => {
    if (location && !hasSearched && me) {
      search()
    }
  }, [location, hasSearched, me])

  const router = useRouter()

  async function sayHi(targetId, signalId) {
    if (!me) return
    
    try {
      const res = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, initiatorId: me?._id, targetId }),
      })
      
      const data = await res.json()
      if (res.ok && data.roomId) {
        router.push(`/chat/${data.roomId}`)
      }
    } catch (err) {
      console.error("Failed to create chat:", err)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <section className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">City layer</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Discover people</h1>
        <p className="mt-2 text-sm text-slate-400">
          Find vibe-matched strangers nearby who are also free right now.
        </p>
      </section>

      {/* Filters */}
      <section className="glass-card p-5 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filter by vibe</p>
        <div className="flex flex-wrap gap-2.5">
          {VIBES.map((v) => (
            <VibeIcon
              key={v}
              vibe={v}
              size="md"
              showLabel
              selected={vibe === v}
              onClick={() => setVibe(v)}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <div className="flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Radius</p>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="input-glow w-full !py-3"
            >
              {[1, 3, 5, 10].map((r) => (
                <option key={r} value={r} className="bg-night-800">{r} km</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={search}
              disabled={loading || !location || !me}
              className="btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Discover
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mt-6">
        {loading ? (
          <SkeletonLoader variant="signal" count={4} />
        ) : results.length > 0 ? (
          <div className="space-y-3 stagger-children">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
              {results.length} {results.length === 1 ? "person" : "people"} found
            </p>
            {results.map((result) => (
              <DiscoverCard key={String(result.signalId)} result={result} onSayHi={sayHi} />
            ))}
          </div>
        ) : hasSearched ? (
          <EmptyState
            icon="🔍"
            title="No one nearby"
            description="Try expanding your radius or changing the vibe filter. People come and go!"
          />
        ) : (
          <EmptyState
            icon="🌍"
            title="Ready to explore?"
            description="Pick a vibe and tap Discover to find people near you who are free right now."
          />
        )}
      </section>
    </div>
  )
}

function DiscoverCard({ result, onSayHi }) {
  const config = getVibeConfig(result.vibe)

  // Match score ring
  const circumference = 2 * Math.PI * 16
  const offset = circumference * (1 - (result.matchScore || 0) / 100)

  return (
    <article className="glass-card !rounded-2xl p-5 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Match score ring */}
        <div className="relative shrink-0">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/10" />
            <circle
              cx="18" cy="18" r="16" fill="none" stroke={config.hex} strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
            {result.matchScore}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white truncate">{result.displayName}</p>
            {result.isIdVerified && (
              <svg className="h-4 w-4 shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {result.communityRating && (
              <span className="text-xs text-amber-300">★ {result.communityRating.toFixed(1)}</span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-400 line-clamp-2">
            {result.publicBio || "Open to a quick hello."}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <VibePill vibe={result.vibe} />
            <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-xs text-slate-300">
              {result.distanceKm} km away
            </span>
          </div>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={() => onSayHi(result.userId, result.signalId)}
          className="btn-white shrink-0 !px-4 !py-2.5 !text-xs"
        >
          <span className="flex items-center gap-1.5">
            👋 Say hi
          </span>
        </button>
      </div>
    </article>
  )
}
