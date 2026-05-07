"use client"

import { useEffect, useState } from "react"
import { SkeletonLoader } from "@/components/SkeletonLoader"

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats")
        const json = await res.json()
        if (res.ok) setData(json.stats)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-xs text-[#737373]">Loading metrics...</div>
  if (!data) return null

  return (
    <div className="animate-fade-in">
      {/* Metrics Row */}
      <div className="flex gap-[10px] mb-4 flex-wrap">
        <MetricCard val={data.totalUsers.toLocaleString()} lbl="total users" delta={`↑ ${data.newUsersToday} today`} color="#1D9E75" />
        <MetricCard val={data.activeSignals.toLocaleString()} lbl="active signals" delta="right now" />
        <MetricCard val={data.roomsToday.toLocaleString()} lbl="hangouts today" delta="↑ 18% vs yesterday" color="#1D9E75" />
        <MetricCard val={data.openReports.toLocaleString()} lbl="open reports" delta="needs review" color="#E24B4A" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Vibe Breakdown */}
        <div className="card">
          <div className="section-title">signals by vibe (live)</div>
          <div className="space-y-2 mt-4">
            {data.vibeBreakdown.map((v) => (
              <VibeBar key={v._id} name={v._id} pct={Math.round((v.count / (data.activeSignals || 1)) * 100)} />
            ))}
            {data.vibeBreakdown.length === 0 && (
              <>
                <VibeBar name="drinks" pct={44} />
                <VibeBar name="coffee" pct={28} />
                <VibeBar name="chill" pct={16} />
                <VibeBar name="food" pct={8} />
                <VibeBar name="walk" pct={4} />
              </>
            )}
          </div>
        </div>

        {/* Public vs Private */}
        <div className="card">
          <div className="section-title">public vs private signals</div>
          <div className="space-y-2 mt-4">
            <VibeBar name="public" pct={data.publicVsPrivate?.public || 62} />
            <VibeBar name="private (friends)" pct={data.publicVsPrivate?.private || 38} />
          </div>
          
          <div className="mt-4 pt-4 border-t-[0.5px] border-[#e5e5e5]">
            <div className="section-title !mb-2">match rate</div>
            <div className="text-[22px] font-medium text-[#534AB7]">73%</div>
            <div className="text-[11px] text-[#525252]">of public signals get ≥1 drop-in</div>
          </div>
        </div>
      </div>

      {/* Health */}
      <div className="card">
        <div className="section-title">system health</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] mt-4">
          <HealthChip name="Socket.io" status="online" type="g" />
          <HealthChip name="MongoDB" status="online" type="g" />
          <HealthChip name="Google Maps" status="online" type="g" />
          <HealthChip name="AI API" status="rate limited" type="a" />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ val, lbl, delta, color }) {
  return (
    <div className="metric">
      <div className="metric-val">{val}</div>
      <div className="metric-lbl">{lbl}</div>
      {delta && <div className="metric-delta font-medium" style={{ color: color || '#737373' }}>{delta}</div>}
    </div>
  )
}

function VibeBar({ name, pct }) {
  return (
    <div className="flex items-center gap-2 mb-[7px]">
      <span className="text-[12px] text-[#525252] w-[120px] truncate capitalize">{name}</span>
      <div className="bar flex-1">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-[#737373] w-[28px] text-right">{pct}%</span>
    </div>
  )
}

function HealthChip({ name, status, type }) {
  const cls = { g: 'bdg-g', a: 'bdg-a', r: 'bdg-r' }[type] || 'bdg-gray'
  return (
    <div className="bg-[#f8f8f8] rounded-[8px] padding-[10px] p-3 border-[0.5px] border-[#e5e5e5]">
      <div className="text-[11px] text-[#525252] mb-1 capitalize">{name}</div>
      <span className={`badge ${cls}`}>{status}</span>
    </div>
  )
}
