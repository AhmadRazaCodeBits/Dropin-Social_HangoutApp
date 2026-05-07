"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { VibePill } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { EmptyState } from "@/components/EmptyState"
import { getPusherClient } from "@/lib/pusher"
import Link from "next/link"

export default function ChatInboxPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // roomId to confirm
  const [deleting, setDeleting] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("all") // all, direct, group
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.ok) setMe(d.user) })
  }, [])

  useEffect(() => {
    if (!me) return
    async function load() {
      try {
        const res = await fetch("/api/chat")
        const data = await res.json()
        if (res.ok) setRooms(data.rooms || [])
      } catch { setRooms([]) }
      finally { setLoading(false) }
    }
    load()
  }, [me])

  useEffect(() => {
    if (!me) return
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(`signals-${me._id}`)
    ch.bind("chat:update", () => {
      fetch("/api/chat").then(r => r.json()).then(d => { if (d.rooms) setRooms(d.rooms) })
    })
    return () => { ch.unbind_all(); pusher.unsubscribe(`signals-${me._id}`) }
  }, [me])

  async function deleteChat(roomId) {
    setDeleting(true)
    try {
      const res = await fetch("/api/chat/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        setRooms(prev => prev.filter(r => r._id !== roomId))
      }
    } catch (err) {
      console.error("Failed to delete chat:", err)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!groupName.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch("/api/chat/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() })
      })
      const data = await res.json()
      if (res.ok && data.roomId) {
        router.push(`/chat/${data.roomId}`)
      }
    } catch (err) {
      console.error("Failed to create group:", err)
    } finally {
      setCreating(false)
      setShowCreateGroup(false)
      setGroupName("")
    }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <section className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Messages</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Inbox</h1>
        </div>
        <button 
          onClick={() => setShowCreateGroup(true)}
          className="btn-primary !py-2 !px-4 !text-[11px] !rounded-full shadow-glow-indigo flex items-center gap-2 group transition-all hover:pr-5"
        >
          <span className="group-hover:scale-125 transition-transform">👥</span> 
          <span className="font-bold uppercase tracking-wider">New Room</span>
        </button>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-6 border border-white/5 max-w-fit">
        {[
          { id: "all", label: "All", count: rooms.length },
          { id: "direct", label: "Direct", count: rooms.filter(r => r.roomType === "dm").length },
          { id: "group", label: "Rooms", count: rooms.filter(r => r.roomType === "group").length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300
              ${activeTab === tab.id ? "text-white bg-indigo-500 shadow-glow-indigo" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader variant="signal" count={4} />
      ) : rooms.filter(r => activeTab === 'all' || r.roomType === activeTab).length > 0 ? (
        <div className="space-y-2 stagger-children">
          {rooms
            .filter(r => activeTab === 'all' || r.roomType === activeTab)
            .map(room => (
            <div key={room._id} className="relative group">
              <div className="flex items-stretch">
                {/* Chat card */}
                <Link
                  href={`/chat/${room._id}`}
                  className={`
                    flex-1 flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300
                    ${room.roomType === 'group' 
                      ? 'border-indigo-500/20 bg-indigo-500/[0.03] hover:bg-indigo-500/[0.08] hover:border-indigo-500/40' 
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1]'}
                  `}
                >
                  <div className="relative shrink-0">
                    <div className={`
                      h-12 w-12 rounded-full ring-2 ring-white/10 flex items-center justify-center text-lg overflow-hidden font-bold text-white
                      ${room.roomType === 'group' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-800'}
                    `}>
                      {room.roomType === "group" ? (
                        "👥"
                      ) : room.otherUser?.avatarUrl ? (
                        <img src={room.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "👤"
                      )}
                    </div>
                    {room.roomType === "dm" && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-night-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-white truncate">
                          {room.roomType === "group" ? (room.name || "Group") : (room.otherUser?.displayName || "Friend")}
                        </p>
                        {room.roomType === 'group' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-tighter">ROOM</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(room.lastMessage?.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.roomType === "group" && (
                        <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {room.memberCount} members
                        </span>
                      )}
                      {room.lastMessage ? (
                        <p className="text-sm text-slate-400 truncate">
                          {room.lastMessage.isMe && <span className="text-slate-500">You: </span>}
                          {room.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Start a conversation</p>
                      )}
                    </div>
                  </div>

                  <VibePill vibe={room.vibe} />
                </Link>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteConfirm(room._id) }}
                  className="ml-2 px-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/20 shrink-0 flex items-center"
                  title="Delete chat"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={activeTab === 'group' ? "👥" : "💬"}
          title={activeTab === 'group' ? "No group rooms yet" : "No conversations yet"}
          description={activeTab === 'group' ? "Create a room and invite your crew to get started!" : "Drop a signal or say hi to someone on Discover to start chatting!"}
          action={activeTab === 'group' 
            ? <button onClick={() => setShowCreateGroup(true)} className="btn-primary">Create Room</button>
            : <Link href="/discover" className="btn-primary">Discover people</Link>
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night-900/80 backdrop-blur-md animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-strong rounded-3xl border border-red-500/20 p-6 max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Chat?</h3>
              <p className="text-sm text-slate-400 mb-6">
                This will permanently delete all messages in this conversation. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 btn-secondary !py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteChat(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowCreateGroup(false)}>
          <div className="glass-strong rounded-[2.5rem] border border-white/10 p-8 w-full max-w-md mx-4 animate-scale-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Background glow */}
            <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="text-center relative z-10">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-indigo mb-6 rotate-3">
                <span className="text-4xl text-white">🚀</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">Launch a New Room</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Create a private space for your crew</p>
              
              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Room Identity</label>
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Late Night Vibes"
                    className="input-glow w-full !py-4 !px-5 !text-lg !rounded-2xl"
                    maxLength={30}
                  />
                  <p className="mt-2 text-[10px] text-slate-600 text-right font-bold uppercase tracking-widest">{groupName.length}/30</p>
                </div>
                
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 btn-secondary !py-4 !rounded-2xl font-bold uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!groupName.trim() || creating}
                    className="flex-1 btn-primary !py-4 !rounded-2xl font-bold uppercase tracking-widest text-xs disabled:opacity-50 shadow-glow-indigo"
                  >
                    {creating ? "Launching..." : "Create Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
