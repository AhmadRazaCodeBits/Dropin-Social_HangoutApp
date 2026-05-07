"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useNotifications } from "@/context/NotificationContext"

export function TopHeader() {
  const [me, setMe] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const dropdownRef = useRef(null)
  
  const { notifications, unreadCount, clearAll, markAsRead } = useNotifications()

  useEffect(() => {
    let alive = true
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (alive && d.ok) setMe(d.user) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header
      id="top-header"
      className={`
        sticky top-0 z-40 transition-all duration-500
        ${scrolled
          ? "border-b border-white/[0.06] bg-night-900/80 backdrop-blur-2xl shadow-lg shadow-black/10"
          : "bg-transparent"
        }
      `}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ember-400 to-amber-400 shadow-glow-ember">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold text-white">DropIn</span>
        </Link>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="notification-bell"
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-slate-300 transition-all duration-200 hover:bg-white/[0.08] hover:text-white ${showNotifs ? 'bg-white/[0.12] text-white' : ''}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ember-500">
                  <span className="absolute inset-0 animate-ping rounded-full bg-ember-400 opacity-75" />
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div className="absolute right-0 mt-3 w-80 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-night-800/95 shadow-2xl backdrop-blur-xl animate-scale-in">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Notifications</h3>
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors">Clear all</button>
                  )}
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      </div>
                      <p className="text-xs font-medium text-slate-400">No new alerts</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.type === 'signal' ? '/radar' : `/chat/${n.roomId}`}
                          onClick={() => {
                            markAsRead(n.id)
                            setShowNotifs(false)
                          }}
                          className={`flex items-start gap-3 p-4 transition-colors hover:bg-white/5 ${n.read ? 'opacity-60' : ''}`}
                        >
                          <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg ${n.type === 'call' ? 'bg-emerald-500/20 text-emerald-400' : n.type === 'message' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {n.type === 'call' ? '📞' : n.type === 'message' ? '💬' : '📍'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{n.type}</p>
                              <span className="text-[9px] text-slate-600">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h4 className="mt-0.5 text-xs font-bold text-white truncate">
                              {n.displayName || n.senderName || (n.type === 'message' ? 'New Message' : 'Nearby Signal')}
                            </h4>
                            <p className="mt-1 text-[10px] text-slate-400 line-clamp-2">
                              {n.type === 'message' ? n.content : n.type === 'call' ? 'Waiting for your answer' : `A friend is nearby (${n.distance}km)`}
                            </p>
                          </div>
                          {!n.read && <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500 shadow-glow-indigo" />}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar / auth */}
          {me ? (
            <Link
              href="/profile"
              className="group flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 transition-all duration-200 hover:bg-white/[0.08]"
            >
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-ember-500 ring-2 ring-white/10 transition-all group-hover:ring-white/25" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-night-900 bg-emerald-400" />
              </div>
              <span className="hidden text-sm font-semibold text-slate-200 sm:block">
                {me.displayName || me.email?.split("@")[0] || "User"}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-white !px-4 !py-2 !text-xs"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
