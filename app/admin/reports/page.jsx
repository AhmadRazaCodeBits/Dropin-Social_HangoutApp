"use client"

import { useEffect, useState } from "react"
import { SkeletonLoader } from "@/components/SkeletonLoader"

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("open")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/reports?status=${status}`)
        const json = await res.json()
        if (res.ok) setReports(json.reports)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [status])

  const handleResolve = async (reportId, action) => {
    const resolution = prompt("Enter resolution notes:")
    if (resolution === null) return
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action, resolution })
      })
      if (res.ok) {
        setReports(prev => prev.filter(r => r._id !== reportId))
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="p-8 max-w-6xl animate-fade-in">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">Reports Queue</h1>
          <p className="text-slate-500 font-medium">Safety violations and community flags</p>
        </div>
        
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
          {["open", "reviewing", "resolved", "dismissed"].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-indigo-500 text-white shadow-glow-indigo' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <SkeletonLoader variant="card" count={3} />
      ) : reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map(report => (
            <div key={report._id} className="glass-card p-6 border-white/5 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest border border-red-500/10 rounded">
                  {report.reason?.replace('_', ' ')}
                </span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  {new Date(report.createdAt).toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-4 mb-6 flex-1">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reported User</p>
                    <p className="text-sm font-bold text-white">{report.reportedId?.displayName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-amber-400 font-black">{report.reportedId?.communityRating?.toFixed(1)} ★</span>
                      {report.reportedId?.publicSuspended && <span className="text-[8px] text-red-400 font-bold uppercase">Suspended</span>}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/5" />
                  <div className="flex-1 text-right">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reporter</p>
                    <p className="text-sm font-bold text-slate-300">{report.reporterId?.displayName || "System"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-xs text-slate-400 italic bg-white/5 p-3 rounded-xl border border-white/5">
                    {report.description || "No additional details provided."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleResolve(report._id, 'clear')}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-glow-teal transition-all"
                >
                  Resolve
                </button>
                <button 
                  onClick={() => handleResolve(report._id, 'dismiss')}
                  className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-40 glass-card border-white/5 border-dashed">
          <div className="text-6xl mb-6">😌</div>
          <h3 className="text-xl font-bold text-white mb-2">Queue Clear</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No reports in the {status} category</p>
        </div>
      )}
    </div>
  )
}
