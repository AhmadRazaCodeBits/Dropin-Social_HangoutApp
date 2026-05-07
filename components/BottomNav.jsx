"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/home",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/chat",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    label: "Radar",
    href: "/radar",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Discover",
    href: "/discover",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      id="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom lg:hidden"
    >
      <div className="mx-auto max-w-lg px-3 pb-2">
        <div className="glass-strong rounded-2xl p-1.5">
          <ul className="grid grid-cols-5 gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    id={`nav-${item.label.toLowerCase()}`}
                    className={`
                      group flex flex-col items-center gap-0.5 rounded-xl px-2 py-2
                      transition-all duration-300 ease-spring
                      ${isActive
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }
                    `}
                  >
                    <span className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-ember-400 animate-scale-in" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
      <div className="flex h-full flex-col gap-2 border-r border-white/[0.06] bg-night-900/50 px-4 py-6 backdrop-blur-xl">
        {/* Logo */}
        <Link href="/home" className="mb-6 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ember-400 to-amber-400 shadow-glow-ember">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">DropIn</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Hang out now</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-2.5
                  transition-all duration-300 ease-spring
                  ${isActive
                    ? "bg-white/10 text-white shadow-inner-glow"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }
                `}
              >
                <span className={`transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ember-400 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className="px-3 text-[10px] uppercase tracking-[0.15em] text-slate-600">
            v1.0 — Spontaneous meetups
          </p>
        </div>
      </div>
    </aside>
  )
}
