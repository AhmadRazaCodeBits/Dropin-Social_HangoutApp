"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getPusherClient } from "@/lib/pusher"
import { VibeIcon } from "@/components/VibeIcon"

const VIBES = ["chill", "chai", "coffee", "burger", "pizza", "food", "dessert", "walk", "drinks", "anything"]
const WINDOWS = [30, 60, 120]
const RADII = [1, 3, 10]

const WINDOW_LABELS = { 30: "30 min", 60: "1 hour", 120: "2 hours" }
const RADIUS_LABELS = { 1: "1 km", 3: "3 km", 10: "10 km" }

export function SignalBroadcaster({ userId, onSignalCreated }) {
  const [vibe, setVibe] = useState("chill")
  const [windowMinutes, setWindowMinutes] = useState(30)
  const [radius, setRadius] = useState(3)
  const [ghost, setGhost] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [publicBio, setPublicBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isBusy = useMemo(() => loading || countdown !== null, [loading, countdown])

  const broadcast = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const client = getPusherClient()
      if (client && !client.connection.socket_id) {
        client.connect()
      }

      const position = await getCurrentPosition()
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          vibe,
          windowMinutes,
          radiusKm: radius,
          isGhost: ghost,
          isPublic,
          publicBio: isPublic ? publicBio.slice(0, 140) : "",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Unable to drop signal")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onSignalCreated) {
        onSignalCreated(data)
      }
    } catch (err) {
      setError(err.message || "Failed to broadcast signal")
    } finally {
      setLoading(false)
    }
  }, [ghost, isPublic, onSignalCreated, publicBio, radius, userId, vibe, windowMinutes])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      void broadcast()
      setCountdown(null)
      return
    }

    const timer = setTimeout(() => setCountdown((v) => (v === null ? null : v - 1)), 1000)
    return () => clearTimeout(timer)
  }, [broadcast, countdown])

  function startCountdown() {
    setError("")
    setSuccess(false)
    setCountdown(5)
  }

  function cancelCountdown() {
    setCountdown(null)
  }

  // Countdown progress for circular ring
  const countdownProgress = countdown !== null ? ((5 - countdown) / 5) * 100 : 0

  return (
    <section className="space-y-5">
      {/* Vibe Selector */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What is the vibe?</p>
        <div className="flex flex-wrap gap-3">
          {VIBES.map((v) => (
            <VibeIcon
              key={v}
              vibe={v}
              size="md"
              showLabel
              selected={vibe === v}
              onClick={() => !isBusy && setVibe(v)}
            />
          ))}
        </div>
      </div>

      {/* Time Window */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How long are you free?</p>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => !isBusy && setWindowMinutes(w)}
              disabled={isBusy}
              className={`
                flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ease-spring
                ${windowMinutes === w
                  ? "bg-white text-night-900 shadow-lg scale-[1.02]"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search radius</p>
        <div className="flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => !isBusy && setRadius(r)}
              disabled={isBusy}
              className={`
                flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ease-spring
                ${radius === r
                  ? "bg-white text-night-900 shadow-lg scale-[1.02]"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {RADIUS_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <ToggleSwitch
          label="Ghost mode"
          description="Friends won't see your name"
          icon="👻"
          checked={ghost}
          onChange={() => !isBusy && setGhost((v) => !v)}
          activeColor="bg-amber-500"
          disabled={isBusy}
        />
        <ToggleSwitch
          label="Public mode"
          description="Visible to nearby strangers"
          icon="🌍"
          checked={isPublic}
          onChange={() => !isBusy && setIsPublic((v) => !v)}
          activeColor="bg-blue-500"
          disabled={isBusy}
        />
      </div>

      {/* Public bio */}
      {isPublic && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Public bio</p>
            <span className="text-xs tabular-nums text-slate-500">{publicBio.length}/140</span>
          </div>
          <textarea
            value={publicBio}
            onChange={(e) => setPublicBio(e.target.value.slice(0, 140))}
            placeholder="What are you up for? (visible to everyone)"
            disabled={isBusy}
            maxLength={140}
            rows={2}
            className="input-glow w-full resize-none"
          />
        </div>
      )}

      {/* Broadcast Button */}
      {countdown !== null ? (
        <div className="relative">
          <button
            type="button"
            onClick={cancelCountdown}
            className="w-full rounded-2xl border-2 border-ember-400/50 bg-ember-500/10 px-5 py-4 font-display text-lg font-bold text-ember-300 transition-all hover:bg-ember-500/20"
          >
            <span className="flex items-center justify-center gap-3">
              <CountdownRing seconds={countdown} total={5} />
              Launching in {countdown}s — tap to cancel
            </span>
          </button>
        </div>
      ) : success ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 py-4 text-emerald-300 font-display font-bold animate-bounce-in">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Signal dropped!
        </div>
      ) : (
        <button
          type="button"
          onClick={startCountdown}
          disabled={isBusy}
          className="btn-primary w-full !py-4 !text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Broadcasting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Drop signal
            </span>
          )}
        </button>
      )}

      {error && (
        <p className="animate-fade-in text-sm text-red-400 text-center">
          {error}
        </p>
      )}
    </section>
  )
}

function ToggleSwitch({ label, description, icon, checked, onChange, activeColor = "bg-emerald-400", disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-300
        ${checked
          ? "border-white/15 bg-white/[0.06]"
          : "border-white/[0.06] bg-white/[0.02]"
        }
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-white/[0.05]"}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-100">{label}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        className={`toggle-track ${checked ? activeColor : "bg-slate-600"}`}
      >
        <span className={`toggle-thumb ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </div>
    </button>
  )
}

function CountdownRing({ seconds, total }) {
  const circumference = 2 * Math.PI * 10
  const progress = ((total - seconds) / total) * circumference

  return (
    <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <circle
        cx="12" cy="12" r="10" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
    </svg>
  )
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    })
  })
}
