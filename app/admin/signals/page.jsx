"use client"

import { useEffect, useState } from "react"

export default function AdminSignals() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/signals")
      const json = await res.json()
      if (res.ok) setSignals(json.signals)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm("EXECUTE_TERMINATE: This signal will be purged from the active registry. Confirm?")) return
    try {
      const res = await fetch("/api/admin/signals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: id })
      })
      if (res.ok) setSignals(prev => prev.filter(s => s._id !== id))
    } catch (err) { console.error(err) }
  }

  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch("/api/admin/signals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: id, updates })
      })
      if (res.ok) {
        const json = await res.json()
        setSignals(prev => prev.map(s => s._id === id ? json.signal : s))
        setEditing(null)
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="animate-fade-in font-mono">
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-[14px] font-black text-[#171717] tracking-[0.1em]">SIGNAL_REGISTRY</h2>
        <span className="text-[10px] text-[#444] font-bold">TOTAL_ACTIVE_BROADCASTS: {signals.length}</span>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-20 text-center text-[11px] text-[#999] tracking-widest animate-pulse">SYNCHRONIZING_REGISTRY...</div>
        ) : signals.map(signal => (
          <div key={signal._id} className="border border-[#e5e5e5] rounded-[4px] overflow-hidden bg-white shadow-sm">
            <div className="px-4 py-3 flex justify-between items-center bg-[#fafafa]">
              <div className="flex items-center gap-4">
                <div className="text-[11px] font-black text-[#534AB7] bg-[#534AB7]/5 px-2 py-1 rounded">SID_{signal._id.slice(-6).toUpperCase()}</div>
                <div>
                  <div className="text-[12px] font-black text-[#171717]">{signal.userId?.displayName || "UNKNOWN_USER"}</div>
                  <div className="text-[9px] text-[#777] font-bold uppercase tracking-tighter">
                    VIBE::{signal.vibe} / MODE::{signal.isPublic ? "PUBLIC" : "PRIVATE"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(signal._id === editing ? null : signal._id)} className="text-[10px] font-black px-3 py-1 bg-white border border-[#e5e5e5] hover:border-[#534AB7] transition-colors">
                  {editing === signal._id ? "CANCEL_OVERRIDE" : "MANUAL_OVERRIDE"}
                </button>
                <button onClick={() => handleDelete(signal._id)} className="text-[10px] font-black px-3 py-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all uppercase">
                  TERMINATE
                </button>
              </div>
            </div>

            {editing === signal._id && (
              <div className="p-5 bg-white border-t border-[#f0f0f0] grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <PropertyEdit 
                    label="VIBE_SIGNATURE" 
                    value={signal.vibe} 
                    type="select" 
                    options={['drinks', 'chai', 'coffee', 'burger', 'pizza', 'food', 'dessert', 'chill', 'walk', 'anything']}
                    onChange={(v) => handleUpdate(signal._id, { vibe: v })}
                  />
                  <PropertyEdit 
                    label="DISCOVERY_RADIUS_M" 
                    value={signal.radius || 1000} 
                    type="number"
                    onChange={(v) => handleUpdate(signal._id, { radius: parseInt(v) })}
                  />
                </div>
                <div className="space-y-4">
                  <PropertyEdit 
                    label="ACCESS_MODE" 
                    value={signal.isPublic ? "public" : "private"} 
                    type="select"
                    options={['public', 'private']}
                    onChange={(v) => handleUpdate(signal._id, { isPublic: v === 'public' })}
                  />
                  <PropertyEdit 
                    label="LIFECYCLE_STATUS" 
                    value={signal.status} 
                    type="select"
                    options={['active', 'expired']}
                    onChange={(v) => handleUpdate(signal._id, { status: v })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && signals.length === 0 && (
          <div className="p-20 text-center text-[11px] text-[#999] border border-dashed border-[#e5e5e5] rounded uppercase tracking-widest">REGISTRY_EMPTY</div>
        )}
      </div>
    </div>
  )
}

function PropertyEdit({ label, value, type, options, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[9px] font-black text-[#999] tracking-widest">{label}</label>
      {type === 'select' ? (
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="text-[12px] p-2 bg-gray-50 border border-[#e5e5e5] rounded outline-none focus:border-[#534AB7] font-mono"
        >
          {options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          defaultValue={value} 
          onBlur={(e) => onChange(e.target.value)}
          className="text-[12px] p-2 bg-gray-50 border border-[#e5e5e5] rounded outline-none focus:border-[#534AB7] font-mono"
        />
      )}
    </div>
  )
}
