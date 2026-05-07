"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SkeletonLoader } from "@/components/SkeletonLoader"

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const code = params?.code

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!code) return
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/chat/group/info/${code}`)
        const data = await res.json()
        if (res.ok) {
          setGroup(data)
        } else {
          setError(data.error || "Group not found")
        }
      } catch (err) {
        setError("Failed to load group details")
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [code])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await fetch("/api/chat/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code })
      })
      const data = await res.json()
      if (res.ok && data.roomId) {
        router.push(`/chat/${data.roomId}`)
      } else {
        alert(data.error || "Failed to join group")
      }
    } catch (err) {
      alert("Something went wrong. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <SkeletonLoader variant="card" count={1} />
    </div>
  )

  if (error) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="text-6xl mb-6">🏜️</div>
      <h1 className="text-2xl font-bold text-white mb-2">Invite link expired</h1>
      <p className="text-slate-400 mb-8 max-w-xs mx-auto">This group might have been deleted or the link is invalid.</p>
      <button onClick={() => router.push("/chat")} className="btn-secondary !px-8">Back to Chats</button>
    </div>
  )

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-scale-in">
      <div className="relative mb-8">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 ring-4 ring-white/10 flex items-center justify-center text-4xl shadow-glow-indigo">
          👥
        </div>
        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 ring-4 ring-night-900 flex items-center justify-center text-sm shadow-lg animate-bounce">
          ✨
        </div>
      </div>
      
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Invitation received</p>
      <h1 className="text-4xl font-black text-white mb-2">{group.name}</h1>
      <p className="text-slate-400 mb-10 font-medium">Join <span className="text-white">{group.memberCount} others</span> in this group</p>
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleJoin}
          disabled={joining}
          className="btn-primary !py-4 shadow-glow-indigo text-lg"
        >
          {joining ? "Joining..." : "Join Group Chat"}
        </button>
        <button
          onClick={() => router.push("/chat")}
          className="btn-secondary !py-4"
        >
          Not now
        </button>
      </div>
      
      <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest font-bold">Powered by DropIn Signals</p>
    </div>
  )
}
