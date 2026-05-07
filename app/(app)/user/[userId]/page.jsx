"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { VibeIcon, VibePill } from "@/components/VibeIcon"
import { vibeMatchScore } from "@/lib/vibe"

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId

  const [user, setUser] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [waving, setWaving] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.ok) setMe(d.user) })
  }, [])

  useEffect(() => {
    if (!userId) return
    async function load() {
      try {
        const res = await fetch(`/api/user/${userId}`)
        const data = await res.json()
        if (res.ok) setUser(data.user)
        else setError(data.error)
      } catch (err) {
        setError("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const handleSendWave = async () => {
    if (!me || waving) return
    setWaving(true)
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: userId })
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/chat/${data.roomId}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setWaving(false)
    }
  }

  const handleBlock = async () => {
    if (!confirm("Block this user? You won't see each other in discovery anymore.")) return
    try {
      const res = await fetch(`/api/user/${userId}/block`, { method: "POST" })
      if (res.ok) {
        alert("User blocked.")
        router.push("/discover")
      }
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="p-8 max-w-2xl mx-auto"><SkeletonLoader variant="card" count={2} /></div>
  if (error) return <div className="p-8 text-center text-slate-500">{error}</div>
  if (!user) return null

  const matchScore = vibeMatchScore(me?.currentVibe || 'anything', user.currentVibe || 'anything')

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 animate-fade-in">
      {/* Header / Avatar */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative mb-6">
          <div className="h-32 w-32 rounded-[3rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-indigo flex items-center justify-center text-5xl font-black text-white rotate-3">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover rounded-[3rem]" /> : user.displayName?.charAt(0)}
          </div>
          {user.isIdVerified && (
            <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-emerald-500 rounded-full border-4 border-night-900 flex items-center justify-center text-white shadow-lg" title="Verified Member">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-black text-white">{user.displayName?.split(' ')[0]}</h1>
          <span className="text-slate-500 font-bold">·</span>
          <span className="text-indigo-400 font-bold">0.3 km away</span>
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow-teal animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now</span>
        </div>

        {/* Vibe Match Badge */}
        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <VibeIcon vibe={user.currentVibe} size="sm" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{user.currentVibe}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Match Score</span>
            <span className="text-sm font-black text-indigo-400">{matchScore}%</span>
          </div>
        </div>
      </div>

      {/* Bio / Quote */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl">&quot;</div>
        <p className="text-lg text-slate-200 font-medium leading-relaxed italic">
          {user.bio || "Just joined DropIn! Let's find a cool spot to hangout."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="glass-card p-4 border-white/5 text-center">
          <p className="text-2xl font-black text-white">{user.totalPublicHangouts || 0}</p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Public Hangouts</p>
        </div>
        <div className="glass-card p-4 border-white/5 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-black text-white">{user.communityRating?.toFixed(1) || "5.0"}</p>
            <span className="text-amber-400 text-lg">★</span>
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Community Rating</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={handleSendWave}
          disabled={waving}
          className="w-full btn-primary !py-5 !rounded-3xl flex items-center justify-center gap-3 shadow-glow-indigo group"
        >
          <span className="text-2xl group-hover:animate-bounce">👋</span>
          <span className="text-sm font-black uppercase tracking-widest">Send a Wave</span>
        </button>
        
        <div className="flex gap-4">
          <button 
            onClick={handleBlock}
            className="flex-1 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-slate-500 hover:text-red-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Block User
          </button>
          <button 
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-500 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Report Profile
          </button>
        </div>
      </div>
    </div>
  )
}
