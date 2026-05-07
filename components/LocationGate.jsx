"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function LocationGate({ children }) {
  const [permission, setPermission] = useState(null)
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()

  const authRoute = pathname === "/login" || pathname === "/signup"

  useEffect(() => {
    if (authRoute) {
      setPermission("granted")
      setChecking(false)
      return
    }

    checkPermission()
  }, [authRoute])

  async function checkPermission() {
    if (!navigator.permissions) {
      setPermission("granted")
      setChecking(false)
      return
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" })
      setPermission(result.state)
      setChecking(false)

      result.addEventListener("change", () => {
        setPermission(result.state)
      })
    } catch (err) {
      console.error("Permissions query failed:", err)
      setPermission("granted")
      setChecking(false)
    }
  }

  async function requestPermission() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported on this device.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => setPermission("granted"),
      () => setPermission("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (checking) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-night-900">
        {/* Animated loading dots */}
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-ember-400" style={{ animationDelay: "0ms" }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-ember-400" style={{ animationDelay: "150ms" }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-ember-400" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-sm text-slate-500">Setting up DropIn...</p>
      </div>
    )
  }

  if (permission !== "granted") {
    return (
      <div className="flex min-h-screen items-center justify-center p-5"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 50% 40%, rgba(239, 95, 31, 0.1), transparent 60%),
            linear-gradient(160deg, #0f121a 0%, #131824 40%, #0f121a 100%)
          `
        }}
      >
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="glass-strong rounded-4xl p-8 text-center">
            {/* Animated location icon */}
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-ember-400/20" />
              <div className="absolute inset-2 animate-pulse-ring rounded-full bg-ember-400/15" style={{ animationDelay: "0.5s" }} />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-ember-400 to-amber-500 shadow-glow-ember">
                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-white">
              {permission === "denied" ? "Location blocked" : "Enable location"}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {permission === "denied"
                ? "Location access was denied. Please enable it in your browser settings and reload the page."
                : "DropIn uses your location to find nearby friends and coordinate meetups safely. Your exact GPS stays private — friends only see ETAs in minutes."}
            </p>

            {/* Privacy badges */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                GPS stays private
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ETA only
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm3 7V7a3 3 0 10-6 0v2h6z" />
                </svg>
                ~400m fuzzing
              </span>
            </div>

            {permission !== "denied" && (
              <button
                onClick={requestPermission}
                className="btn-primary mt-6 w-full"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Allow location access
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
