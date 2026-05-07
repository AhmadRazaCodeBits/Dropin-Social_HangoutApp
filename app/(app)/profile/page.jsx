"use client"

import { useEffect, useState } from "react"
import { ProfileDashboard } from "@/components/ProfileDashboard"

export default function ProfilePage() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMe(d.user)
      })
      .catch(() => {})
  }, [])

  if (!me) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-400">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <ProfileDashboard userId={me._id} />
    </div>
  )
}
