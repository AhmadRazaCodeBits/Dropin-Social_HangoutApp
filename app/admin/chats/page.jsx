"use client"

import { useEffect, useState } from "react"

export default function AdminChats() {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRooms = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/chats")
      const json = await res.json()
      if (res.ok) setRooms(json.rooms)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadMessages = async (roomId) => {
    try {
      const res = await fetch(`/api/admin/chats?roomId=${roomId}`)
      const json = await res.json()
      if (res.ok) setMessages(json.messages)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { loadRooms() }, [])

  const handleDeleteRoom = async (id) => {
    if (!confirm("COMMS_SHUTDOWN: This room and all historical logs will be permanently purged. Confirm?")) return
    try {
      const res = await fetch("/api/admin/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'room', id })
      })
      if (res.ok) {
        setRooms(prev => prev.filter(r => r._id !== id))
        if (selectedRoom === id) {
          setSelectedRoom(null)
          setMessages([])
        }
      }
    } catch (err) { console.error(err) }
  }

  const handleDeleteMessage = async (id) => {
    try {
      const res = await fetch("/api/admin/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'message', id })
      })
      if (res.ok) setMessages(prev => prev.filter(m => m._id !== id))
    } catch (err) { console.error(err) }
  }

  return (
    <div className="animate-fade-in font-mono grid grid-cols-[300px_1fr] gap-10 h-[calc(100vh-180px)]">
      {/* Rooms List */}
      <div className="flex flex-col border-r border-gray-100 pr-8 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[12px] font-black text-[#171717] tracking-[0.2em]">ROOM_INDEX</h2>
          <span className="text-[9px] text-[#999] font-bold">TOTAL: {rooms.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
          {loading ? (
            <div className="p-10 text-center text-[10px] text-[#999] animate-pulse uppercase tracking-widest">POLLING_ROOMS...</div>
          ) : rooms.map(room => (
            <div 
              key={room._id} 
              onClick={() => { setSelectedRoom(room._id); loadMessages(room._id); }}
              className={`p-4 border rounded-[4px] cursor-pointer transition-all ${selectedRoom === room._id ? 'border-[#534AB7] bg-[#534AB7]/5' : 'border-[#e5e5e5] hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-black text-[#171717]">RID_{room._id.slice(-6).toUpperCase()}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room._id); }} className="text-[9px] text-red-500 font-black hover:bg-red-500 hover:text-white px-2 py-0.5 border border-red-100 rounded transition-all uppercase">purge</button>
              </div>
              <div className="text-[9px] text-[#777] font-bold uppercase tracking-tighter">LAST_ACTIVITY: {new Date(room.updatedAt).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[12px] font-black text-[#171717] tracking-[0.2em]">LOG_STREAM</h2>
          {selectedRoom && <span className="text-[10px] text-[#534AB7] font-black uppercase">AUDITING_RID_{selectedRoom.slice(-6).toUpperCase()}</span>}
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
          {!selectedRoom ? (
            <div className="h-full flex items-center justify-center text-[11px] text-[#999] border-2 border-dashed border-gray-50 rounded uppercase tracking-[0.2em]">SELECT_ROOM_FOR_AUDIT</div>
          ) : messages.length === 0 ? (
            <div className="p-20 text-center text-[11px] text-[#999] uppercase tracking-widest italic">NO_LOG_DATA_FOUND</div>
          ) : messages.map(msg => (
            <div key={msg._id} className="group relative p-4 bg-white border border-[#e5e5e5] rounded-[4px] hover:border-[#534AB7] transition-all">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-[#534AB7] border border-[#534AB7]/20 px-2 py-0.5 rounded uppercase">{msg.msgType}</span>
                  <span className="text-[9px] text-[#999] font-bold">{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => handleDeleteMessage(msg._id)}
                  className="opacity-0 group-hover:opacity-100 text-[9px] text-red-600 font-black px-2 py-1 bg-red-50 rounded hover:bg-red-600 hover:text-white transition-all uppercase"
                >
                  DELETE_ENTRY
                </button>
              </div>
              <p className="text-[13px] text-[#171717] leading-relaxed font-sans">{msg.content || JSON.stringify(msg.location || msg.venue)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
