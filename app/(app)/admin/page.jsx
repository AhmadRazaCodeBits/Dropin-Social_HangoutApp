"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SkeletonLoader } from "@/components/SkeletonLoader"

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin")
        if (res.status === 403 || res.status === 401) {
          router.push("/")
          return
        }
        const json = await res.json()
        if (res.ok) setData(json)
        else setError(json.error)
      } catch (err) {
        setError("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-8 max-w-6xl mx-auto"><SkeletonLoader variant="card" count={3} /></div>
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>
  if (!data) return null

  const { stats, recentUsers, recentRooms } = data

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20">Admin Core</span>
          <div className="h-1 flex-1 bg-white/5 rounded-full" />
        </div>
        <h1 className="text-4xl font-black text-white">System Dashboard</h1>
        <p className="text-slate-500 mt-1 font-medium">Real-time overview of the DropIn network</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Users", value: stats.users, icon: "👤", color: "from-blue-500 to-indigo-600" },
          { label: "Active Rooms", value: stats.rooms, icon: "💬", color: "from-purple-500 to-pink-600" },
          { label: "Total Messages", value: stats.messages, icon: "⚡", color: "from-amber-500 to-orange-600" },
          { label: "Live Signals", value: stats.signals, icon: "📍", color: "from-emerald-500 to-teal-600" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth +0%</span>
            </div>
            <p className="text-3xl font-black text-white">{stat.value.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recent Users
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold text-slate-400">Latest 10</span>
            </h2>
          </div>
          <div className="glass-card border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joined</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentUsers.map(user => (
                  <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-700 overflow-hidden shrink-0">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : "👤"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 font-bold">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/10">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Rooms */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recent Rooms
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold text-slate-400">Latest 10</span>
            </h2>
          </div>
          <div className="glass-card border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Room Name</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentRooms.map(room => (
                  <tr key={room._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-white truncate">{room.name || "Direct Chat"}</p>
                      <p className="text-[9px] text-slate-500 font-medium">ID: {room._id.substring(0, 8)}...</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${room.roomType === 'group' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'}`}>
                        {room.roomType}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 font-bold">
                      {room.members?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-slate-600">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">DropIn v2.0 - Admin Interface</p>
        <p className="text-[10px] font-medium">System Secure & Encrypted</p>
      </footer>
    </div>
  )
}
