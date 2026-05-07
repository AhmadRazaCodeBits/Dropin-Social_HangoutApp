"use client"

import { useEffect, useState } from "react"

export default function AdminSafety() {
  const [settings, setSettings] = useState({
    gpsVelocityThresholdKmh: 200,
    noShowRatingPenalty: 0.5,
    publicSuspensionThreshold: 3,
    discoveryRatingFloor: 2.5,
    maxPublicRadiusKm: 10,
    maxSignalWindowMins: 120,
    publicModeEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings")
        const json = await res.json()
        if (res.ok) {
          const s = {}
          json.settings.forEach(item => { s[item.key] = item.value })
          setSettings(prev => ({ ...prev, ...s }))
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }))
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      })
      if (res.ok) alert("Safety rules updated")
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-4 text-xs text-[#737373]">Loading rules...</div>

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <RuleCard 
        title="GPS velocity threshold" 
        desc="Reject ETA ping if speed > X km/h — flag as suspicious"
        control={(
          <>
            <input 
              type="range" min="50" max="500" step="10" 
              value={settings.gpsVelocityThresholdKmh} 
              onChange={(e) => setSettings({ ...settings, gpsVelocityThresholdKmh: parseInt(e.target.value) })} 
              className="accent-[#534AB7] flex-1 h-1 bg-[#f8f8f8] rounded-full"
            />
            <span className="text-[12px] font-medium text-[#534AB7] w-20 text-right">{settings.gpsVelocityThresholdKmh} km/h</span>
          </>
        )}
      />

      <RuleCard 
        title="No-show penalty" 
        desc="Rating deducted per confirmed no-show after venue lock"
        control={(
          <>
            <input 
              type="range" min="0.1" max="1.0" step="0.1" 
              value={settings.noShowRatingPenalty} 
              onChange={(e) => setSettings({ ...settings, noShowRatingPenalty: parseFloat(e.target.value) })} 
              className="accent-[#534AB7] flex-1 h-1 bg-[#f8f8f8] rounded-full"
            />
            <span className="text-[12px] font-medium text-[#534AB7] w-32 text-right">−{settings.noShowRatingPenalty} per no-show</span>
          </>
        )}
      />

      <RuleCard 
        title="Public suspension threshold" 
        desc="Suspend from public mode after X no-shows total"
        control={(
          <>
            <input 
              type="range" min="1" max="10" step="1" 
              value={settings.publicSuspensionThreshold} 
              onChange={(e) => setSettings({ ...settings, publicSuspensionThreshold: parseInt(e.target.value) })} 
              className="accent-[#534AB7] flex-1 h-1 bg-[#f8f8f8] rounded-full"
            />
            <span className="text-[12px] font-medium text-[#534AB7] w-20 text-right">{settings.publicSuspensionThreshold} no-shows</span>
          </>
        )}
      />

      <RuleCard 
        title="Auto-remove rating floor" 
        desc="Auto-remove from public discovery if rating falls below X"
        control={(
          <>
            <input 
              type="range" min="1" max="4" step="0.5" 
              value={settings.discoveryRatingFloor} 
              onChange={(e) => setSettings({ ...settings, discoveryRatingFloor: parseFloat(e.target.value) })} 
              className="accent-[#534AB7] flex-1 h-1 bg-[#f8f8f8] rounded-full"
            />
            <span className="text-[12px] font-medium text-[#534AB7] w-20 text-right">{settings.discoveryRatingFloor} stars</span>
          </>
        )}
      />

      <RuleCard 
        title="Public mode visibility" 
        desc="Allow signal broadcast to be visible to non-friends"
        control={(
          <div 
            onClick={() => setSettings({ ...settings, publicModeEnabled: !settings.publicModeEnabled })}
            className={`toggle ${settings.publicModeEnabled ? 'on' : 'off'}`} 
          />
        )}
      />

      <RuleCard 
        title="Max public radius" 
        desc="Cap how far a public signal can broadcast"
        control={(
          <>
            <input 
              type="range" min="1" max="20" step="1" 
              value={settings.maxPublicRadiusKm} 
              onChange={(e) => setSettings({ ...settings, maxPublicRadiusKm: parseInt(e.target.value) })} 
              className="accent-[#534AB7] flex-1 h-1 bg-[#f8f8f8] rounded-full"
            />
            <span className="text-[12px] font-medium text-[#534AB7] w-20 text-right">{settings.maxPublicRadiusKm} km</span>
          </>
        )}
      />

      <button 
        onClick={handleSave}
        disabled={saving}
        className="bg-[#534AB7] text-[#EEEDFE] border-none rounded-[8px] p-[10px_20px] text-[13px] cursor-pointer self-start mt-1 hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving..." : "Save all rules"}
      </button>
    </div>
  )
}

function RuleCard({ title, desc, control }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="text-[13px] font-medium text-[#171717]">{title}</div>
      <div className="text-[12px] text-[#525252]">{desc}</div>
      <div className="flex items-center gap-[10px] mt-1">{control}</div>
    </div>
  )
}
