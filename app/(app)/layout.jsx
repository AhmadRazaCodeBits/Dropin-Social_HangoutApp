"use client"

import { TopHeader } from "@/components/TopHeader"
import { BottomNav, SideNav } from "@/components/BottomNav"
import { SignalAlertProvider } from "@/components/SignalAlertProvider"
import { NotificationProvider } from "@/context/NotificationContext"

export default function AppLayout({ children }) {
  return (
    <NotificationProvider>
      <SignalAlertProvider>
        <SideNav />
        <div className="lg:pl-64">
          <TopHeader />
          <main className="page-enter pb-24 lg:pb-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </SignalAlertProvider>
    </NotificationProvider>
  )
}