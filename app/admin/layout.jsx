"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import "./admin.css"

export default function AdminLayout({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (!res.ok || (data.user?.role !== 'admin' && data.user?.role !== 'moderator')) {
          if (pathname !== '/admin/login') {
            router.push("/admin/login")
          }
        } else {
          setMe(data.user)
        }
      } catch (err) {
        if (pathname !== '/admin/login') router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>
  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-[#534AB7] font-medium animate-pulse">AUTH...</div>
  if (!me) return null

  const navItems = [
    { id: 'users', label: 'USER_DATABASE', href: "/admin/users", icon: '◉' },
    { id: 'signals', label: 'SIGNAL_CORE', href: "/admin/signals", icon: '◎' },
    { id: 'chats', label: 'COMMS_AUDIT', href: "/admin/chats", icon: '◑' },
    { id: 'settings', label: 'SYSTEM_CONFIG', href: "/admin/settings", icon: '◈' },
  ]

  return (
    <div className="admin-body p-10 min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-[1000px] flex border-[0.5px] border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-sm">
        {/* Sidebar */}
        <aside className="sidebar !bg-[#0a0a0a] !border-[#1a1a1a]">
          <div className="px-5 py-6 border-b-[0.5px] border-[#1a1a1a] mb-4">
            <div className="text-[12px] font-black text-[#534AB7] tracking-[0.2em] mb-1">CORE_CONTROLLER</div>
            <div className="text-[10px] text-[#444] font-bold">SYSTEM_STATUS: <span className="text-[#1D9E75]">OPERATIONAL</span></div>
          </div>
          
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item !px-5 !py-3 !text-[11px] font-black tracking-widest ${isActive ? 'on !bg-[#111]' : '!text-[#444] hover:!text-[#999]'}`}
                >
                  <span className="text-[14px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto p-5 border-t-[0.5px] border-[#1a1a1a]">
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }} className="text-[9px] font-black text-[#444] uppercase tracking-[0.3em] hover:text-red-500 transition-colors">
              SHUTDOWN_SESSION
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-5 min-h-[520px] overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
