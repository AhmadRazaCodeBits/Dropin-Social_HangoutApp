"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const FriendRadar = dynamic(
  () => import("@/components/FriendRadar").then((mod) => mod.FriendRadar),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
          <div className="absolute inset-3 animate-spin rounded-full border-2 border-transparent border-t-ember-400" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
        <p className="text-sm text-slate-500">Loading radar...</p>
      </div>
    ),
  }
)

export default function RadarPage() {
  const [me, setMe] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMe(d.user)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => setError("Location permission is required for radar"),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    )
  }, [])

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-2xl">
            📍
          </div>
          <h2 className="font-display text-xl font-bold text-white">Location unavailable</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary mt-5"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!userLocation || !me) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-indigo-500/20" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-indigo-500/15 text-2xl">
            📍
          </div>
        </div>
        <p className="text-sm text-slate-500">Loading radar...</p>
      </div>
    )
  }

  return <FriendRadar userLocation={userLocation} userId={me._id} />
}
