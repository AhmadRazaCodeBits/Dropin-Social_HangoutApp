"use client"

import { createContext, useContext, useState, useCallback } from "react"

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      // Avoid duplicate notifications (e.g. for the same call or signal)
      if (notif.id && prev.find(p => p.id === notif.id)) return prev
      
      const newNotif = {
        id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
        displayName: notif.displayName || notif.senderName || (notif.type === 'message' ? 'New Message' : 'Nearby Signal'),
        ...notif
      }
      
      // Only increment unread if it's truly a new notification
      setUnreadCount(c => c + 1)
      return [newNotif, ...prev].slice(0, 50) // Keep last 50
    })
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      removeNotification, 
      markAsRead, 
      clearAll 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
