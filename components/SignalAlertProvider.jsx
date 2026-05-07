"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getPusherClient } from "@/lib/pusher"
import { VibeIcon } from "@/components/VibeIcon"
import { useNotifications } from "@/context/NotificationContext"
import Link from "next/link"

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function SignalAlertProvider({ children }) {
  const [me, setMe] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const { notifications, addNotification, removeNotification } = useNotifications()
  
  // Track current call notification to handle persistent display
  const [activeCall, setActiveCall] = useState(null)
  const [activeToast, setActiveToast] = useState(null) // Non-call toast

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setMe(d.user) })
      .catch(() => {})

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null,
        { enableHighAccuracy: true }
      )
    }
  }, [])

  const handleNewSignal = useCallback((payload) => {
    if (!me || !userLocation || payload.userId === me._id) return
    const dist = getDistance(userLocation.lat, userLocation.lng, payload.lat, payload.lng)
    
    if (dist <= payload.radiusKm) {
      const notif = {
        id: `signal-${payload.userId}-${Date.now()}`,
        type: "signal",
        ...payload,
        distance: dist.toFixed(1)
      }
      addNotification(notif)
      setActiveToast(notif)
      setTimeout(() => setActiveToast(null), 8000)
    }
  }, [me, userLocation, addNotification])

  useEffect(() => {
    if (!me) return
    const pusher = getPusherClient()
    if (!pusher) return

    const publicChannel = pusher.subscribe("signals-public")
    publicChannel.bind("signal:new", handleNewSignal)

    const privateChannel = pusher.subscribe(`signals-${me._id}`)
    
    privateChannel.bind("chat:new", (payload) => {
      if (window.location.pathname.includes(`/chat/${payload.roomId}`)) return
      const notif = { id: payload._id || `msg-${Date.now()}`, type: "message", ...payload }
      addNotification(notif)
      setActiveToast(notif)
      setTimeout(() => setActiveToast(null), 8000)
    })

    privateChannel.bind("call:incoming", (payload) => {
      const callId = `call-${payload.roomId}-${Date.now()}`
      const callNotif = {
        id: callId,
        type: "call",
        ...payload,
        displayName: payload.sender?.displayName || "Incoming Call"
      }
      addNotification(callNotif)
      setActiveCall(callNotif)
      
      // Auto-dismiss call notification after 60 seconds if not answered
      setTimeout(() => {
        setActiveCall(prev => (prev?.id === callId ? null : prev))
      }, 60000)
    })

    privateChannel.bind("call:action", (payload) => {
      // If call is cancelled or declined, remove it
      if (["cancel", "decline", "end"].includes(payload.action)) {
        setActiveCall(prev => (prev?.roomId === payload.roomId ? null : prev))
        removeNotification(`call-${payload.roomId}`)
      }
    })

    return () => {
      publicChannel.unbind_all()
      pusher.unsubscribe("signals-public")
      privateChannel.unbind_all()
      pusher.unsubscribe(`signals-${me._id}`)
    }
  }, [handleNewSignal, me, addNotification, removeNotification])

  const declineCall = async (call) => {
    setActiveCall(null)
    removeNotification(call.id)
    try {
      await fetch(`/api/chat/${call.roomId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me._id, type: call.type, action: "decline" })
      })
    } catch (err) { console.error(err) }
  }

  return (
    <>
      {children}

      {/* Message / Signal Toast */}
      {activeToast && !activeCall && (
        <div className="fixed left-0 right-0 top-6 z-[9998] flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-md animate-slide-down pointer-events-auto">
            <a
              href={activeToast.type === 'signal' ? '/radar' : `/chat/${activeToast.roomId}`}
              onClick={() => setActiveToast(null)}
              className="flex items-center gap-3 p-4 glass-strong rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-white/20"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                activeToast.type === 'message' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {activeToast.type === 'message' ? '💬' : '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  {activeToast.type === 'message' ? 'New message' : 'Nearby signal'}
                </p>
                <h4 className="text-sm font-bold text-white truncate">
                  {activeToast.senderName || activeToast.displayName || 'Someone'}
                </h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {activeToast.type === 'message' ? activeToast.content : `A friend is nearby (${activeToast.distance}km)`}
                </p>
              </div>
              <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}
      
      {activeCall && (
        <div className="fixed left-0 right-0 top-6 z-[9999] flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-md animate-slide-down pointer-events-auto">
            <div className="glass-strong overflow-hidden rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/20 bg-gradient-to-br from-emerald-500 to-teal-600">
                    📞
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-400 border-2 border-night-900" />
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                    Incoming call
                  </p>
                  <h4 className="mt-0.5 font-display text-lg font-bold text-white truncate">
                    {activeCall.displayName}
                  </h4>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-xs text-emerald-400 font-bold animate-pulse">Waiting for your answer...</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/chat/${activeCall.roomId}`} 
                    onClick={() => setActiveCall(null)}
                    className="btn-primary !bg-green-500 !text-white !px-4 !py-2.5 !text-[11px] !font-black uppercase tracking-widest shadow-lg shadow-green-500/40 hover:!bg-green-400 transition-all hover:scale-105 active:scale-95"
                  >
                    Accept Call
                  </Link>
                  <button 
                    onClick={() => declineCall(activeCall)}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
