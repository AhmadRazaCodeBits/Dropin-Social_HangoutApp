"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPusherClient } from "@/lib/pusher"
import { VibeIcon, VibePill } from "@/components/VibeIcon"
import { SkeletonLoader } from "@/components/SkeletonLoader"
import { CallOverlay } from "@/components/CallOverlay"
import Link from "next/link"
import dynamic from "next/dynamic"

const ChatMap = dynamic(
  () => import("@/components/ChatMap").then((mod) => mod.ChatMap),
  { ssr: false }
)

const STICKERS = [
  { id: "s1", emoji: "🔥" }, { id: "s2", emoji: "👋" }, { id: "s3", emoji: "❤️" },
  { id: "s4", emoji: "🤣" }, { id: "s5", emoji: "✨" }, { id: "s6", emoji: "📍" }
]

function googleStaticMapUrl(lat, lng, width = 400, height = 200) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return ""
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
    markers: `color:red|${lat},${lng}`,
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params?.id
  
  // 1. All Hooks at the top
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [voting, setVoting] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [call, setCall] = useState(null) 
  const [connStatus, setConnStatus] = useState("connecting")
  const [otherUser, setOtherUser] = useState(null)
  const [hangout, setHangout] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [reacting, setReacting] = useState(null) // messageId being reacted to
  const [recording, setRecording] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [myLocation, setMyLocation] = useState(null)
  const [otherLocation, setOtherLocation] = useState(null)
  
  const [showSettings, setShowSettings] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [renaming, setRenaming] = useState(false)
  
  const [addMemberInput, setAddMemberInput] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeout = useRef(null)
  const mediaRecorderRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 2. Load User Profile
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.ok) setMe(d.user) })
  }, [])

  // 3. Load Chat Data & Set Other User
  useEffect(() => {
    if (!roomId) return
    async function loadData() {
      try {
        const res = await fetch(`/api/chat/${roomId}`)
        const data = await res.json()
        if (res.ok) {
          setRoom(data.room)
          setMessages(data.messages)
          setNewGroupName(data.room.name || "")
        }
      } catch (err) {
        console.error("Failed to load chat:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [roomId])

  useEffect(() => {
    if (room && me) {
      setOtherUser(room.members.find(m => String(m._id) !== String(me._id)))
    }
  }, [room, me])

  // 4. Pusher Integration
  useEffect(() => {
    if (!roomId) return

    const pusher = getPusherClient()
    if (!pusher) return

    pusher.connect()
    const roomChannel = pusher.subscribe(`chat-${roomId}`)
    
    roomChannel.bind("pusher:subscription_succeeded", () => setConnStatus("connected"))
    roomChannel.bind("pusher:subscription_error", () => setConnStatus("error"))

    roomChannel.bind("message:new", async (payload) => {
      if (payload.metadata?.url === "FETCH_LATEST") {
        const res = await fetch(`/api/chat/${roomId}`)
        const data = await res.json()
        if (res.ok) setMessages(data.messages)
        return
      }
      setMessages(prev => {
        if (prev.find(m => m._id === payload._id)) return prev
        const newMsgs = [...prev, payload]
        return newMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      })
    })

    roomChannel.bind("vote:update", (payload) => {
      setMessages(prev => prev.map(m => {
        if (m._id === payload.messageId) {
          return { ...m, metadata: { ...m.metadata, votes: payload.votes } }
        }
        return m
      }))
    })

    roomChannel.bind("hangout:started", (payload) => {
      setHangout(payload)
      setMessages(prev => [...prev, {
        _id: `h-${Date.now()}`,
        msgType: "system",
        content: payload.message,
        createdAt: new Date()
      }])
      setTimeout(() => setHangout(null), 8000)
    })

    roomChannel.bind("typing", (payload) => {
      if (payload.userId !== me?._id) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
      }
    })

    roomChannel.bind("reaction:update", (payload) => {
      setMessages(prev => prev.map(m => {
        if (m._id === payload.messageId) {
          return { ...m, metadata: { ...m.metadata, reactions: payload.reactions } }
        }
        return m
      }))
    })

    roomChannel.bind("messages:read", (payload) => {
      if (payload.userId !== me?._id) {
        setMessages(prev => prev.map(m => ({
          ...m, metadata: { ...m.metadata, readBy: [...(m.metadata?.readBy || []), payload.userId] }
        })))
      }
    })

    roomChannel.bind("location:update", (payload) => {
      if (payload.userId !== me?._id) {
        setOtherLocation({ lat: payload.lat, lng: payload.lng })
      }
    })

    let privateChannel = null
    if (me?._id) {
      privateChannel = pusher.subscribe(`signals-${me._id}`)
      privateChannel.bind("call:incoming", (payload) => {
        if (payload.roomId === roomId) setCall({ type: payload.type, incoming: true })
      })
    }

    return () => {
      roomChannel.unbind_all()
      pusher.unsubscribe(`chat-${roomId}`)
      if (privateChannel) {
        privateChannel.unbind_all()
        pusher.unsubscribe(`signals-${me._id}`)
      }
    }
  }, [roomId, me?._id])

  const prevMsgCount = useRef(0)
  const hasMarkedRead = useRef(false)

  useEffect(() => {
    // Only scroll if message count actually increased (new message arrived)
    if (messages.length > prevMsgCount.current) {
      scrollToBottom()
    }
    prevMsgCount.current = messages.length

    // Mark as read only once per chat session
    if (!hasMarkedRead.current && me && roomId && messages.length > 0) {
      hasMarkedRead.current = true
      fetch(`/api/chat/${roomId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me._id })
      }).catch(() => {})
    }
  }, [messages])

  useEffect(() => {
    if (!showMap || !me || !roomId) return
    
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setMyLocation({ lat, lng })
          
          fetch(`/api/chat/${roomId}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: me._id, lat, lng })
          }).catch(console.error)
        },
        (err) => console.error("Location error:", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      )
    }
    
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId)
    }
  }, [showMap, me, roomId])

  // 5. Handlers
  async function sendMessage(payload) {
    if (!me || sending) return
    const { content, msgType = "text", metadata = {} } = payload
    if (msgType === "text" && !content) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me._id, content, msgType, metadata })
      })
      if (res.ok) {
        const data = await res.json()
        // Optimistically add the message to local state immediately
        // so the sender sees it without waiting for Pusher echo
        if (data.message) {
          setMessages(prev => {
            if (prev.find(m => m._id === data.message._id)) return prev
            return [...prev, data.message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          })
        }
        setInput("")
        setShowStickers(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  async function submitVote(messageId, venueName) {
    if (!me) return
    try {
      await fetch("/api/chat/venue-vote/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: me._id, venueName })
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function triggerVenueVote() {
    if (voting || !room) return
    setVoting(true)
    try {
      // Get current position first for high accuracy
      let lat, lng
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (e) {
        console.warn("Could not get live location for vote, falling back to signals")
      }

      await fetch("/api/chat/venue-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId, 
          vibe: room.signalId?.vibe || "anything",
          lat,
          lng
        })
      })
    } catch (err) {
      console.error(err)
    } finally {
      setVoting(false)
    }
  }

  async function initiateCall(type) {
    if (!me || !roomId) return
    setCall({ type, incoming: false })
    try {
      await fetch(`/api/chat/${roomId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me._id, type })
      })
      // Add a local system message for immediate feedback
      setMessages(prev => [...prev, {
        _id: `sys-${Date.now()}`,
        msgType: "system",
        content: `You started a ${type} call`,
        createdAt: new Date()
      }])
    } catch (err) {
      console.error(err)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      sendMessage({ content: "Shared an image", msgType: "image", metadata: { url: event.target.result } })
    }
    reader.readAsDataURL(file)
  }

  function emitTyping() {
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    fetch(`/api/chat/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: me?._id, content: "", msgType: "typing" })
    }).catch(() => {})
    typingTimeout.current = setTimeout(() => {}, 2000)
  }

  async function addReaction(messageId, emoji) {
    setReacting(null)
    try {
      await fetch(`/api/chat/${roomId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: me._id, emoji })
      })
    } catch (err) { console.error(err) }
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: "audio/webm" })
        const reader = new FileReader()
        reader.onload = (e) => {
          sendMessage({ content: "🎙 Voice message", msgType: "voice", metadata: { url: e.target.result } })
        }
        reader.readAsDataURL(blob)
        setRecording(false)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error("Mic access denied:", err)
    }
  }

  function stopVoiceRecording() {
    mediaRecorderRef.current?.stop()
  }

  const handleShareLocation = (lat, lng, place = null) => {
    sendMessage({
      content: place?.name ? `Shared ${place.name}` : "Shared a location",
      msgType: "location",
      metadata: {
        lat,
        lng,
        placeId: place?.placeId,
        placeName: place?.name,
        address: place?.address || place?.vicinity,
      }
    })
    setShowMap(false)
  }

  const handleRenameGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim() || renaming || !roomId) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/chat/${roomId}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() })
      })
      if (res.ok) {
        setRoom(prev => ({ ...prev, name: newGroupName.trim() }))
        setShowSettings(false)
      }
    } catch (err) {
      console.error("Failed to rename group:", err)
    } finally {
      setRenaming(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!addMemberInput.trim() || addingMember || !roomId) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/chat/${roomId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addMemberInput.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh room data to see new member
        const r = await fetch(`/api/chat/${roomId}`)
        const d = await r.json()
        if (r.ok) setRoom(d.room)
        setAddMemberInput("")
      } else {
        alert(data.error || "Failed to add member")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!roomId || !confirm("Are you sure you want to remove this member?")) return
    try {
      const res = await fetch(`/api/chat/${roomId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
      if (res.ok) {
        setRoom(prev => ({ ...prev, members: prev.members.filter(m => String(m._id) !== String(userId)) }))
      } else {
        const data = await res.json()
        alert(data.error || "Failed to remove member")
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-8"><SkeletonLoader variant="card" count={3} /></div>
  if (!room) return <div className="flex h-[70vh] items-center justify-center text-slate-400">Chat room not found</div>

  return (
    <div className="flex flex-col h-[calc(100vh-var(--nav-height))] max-w-4xl mx-auto relative overflow-hidden">
      {call && (
        <CallOverlay 
          type={call.type} 
          otherUser={otherUser} 
          onEnd={() => setCall(null)} 
          incoming={call.incoming}
          roomId={roomId}
          me={me}
        />
      )}

      {showMap && (
        <ChatMap 
          myLocation={myLocation} 
          otherLocation={otherLocation} 
          me={me} 
          otherUser={otherUser} 
          onClose={() => setShowMap(false)} 
          onShareLocation={handleShareLocation}
        />
      )}

      {/* Header */}
      <header className="glass-card !rounded-none !border-x-0 !border-t-0 p-4 flex items-center gap-4 z-10">
        <button onClick={() => router.back()} className="lg:hidden text-slate-400 p-1">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 ring-2 ring-white/10 flex items-center justify-center font-bold text-white">
            {room?.roomType === "group" ? "👥" : (otherUser?.displayName?.charAt(0) || "👤")}
          </div>
          {room?.roomType === "group" && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-tighter">ROOM</div>
          )}
          {room?.roomType === "dm" && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-night-900" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white truncate">
              {room?.roomType === "group" ? (room.name || "Group") : (otherUser?.displayName || "Friend")}
            </h2>
            {room?.roomType === "group" && (
              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-glow-indigo" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connStatus === 'connected' ? 'bg-emerald-500 shadow-glow-teal' : 'bg-amber-500 animate-pulse'}`} />
            <button 
              onClick={() => room?.roomType === 'group' && setShowSettings(true)}
              className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${room?.roomType === 'group' ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-400'}`}
            >
              {room?.roomType === "group" ? `${room.members?.length} members` : (connStatus === 'connected' ? 'Real-time active' : 'Connecting...')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {room?.roomType === "group" && (
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          )}
          <button onClick={() => initiateCall('voice')} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </button>
          <button onClick={() => initiateCall('video')} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button onClick={() => setShowMap(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button onClick={triggerVenueVote} disabled={voting} className="btn-secondary !py-2 !px-3 !text-[10px] !font-bold ml-1">
            {voting ? "..." : "🤖 Suggest Spots"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className={`flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide relative`}>
        {room?.roomType === 'group' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]" />
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = String(msg.senderId) === String(me?._id)
          const isSystem = msg.msgType === "system"
          const isVote = msg.msgType === "venue_vote"
          const isImage = msg.msgType === "image"
          const isSticker = msg.msgType === "sticker"
          const isVoice = msg.msgType === "voice"
          const isLocation = msg.msgType === "location"
          const reactions = msg.metadata?.reactions || {}
          const readBy = msg.metadata?.readBy || []

          if (isSystem) {
            return (
              <div key={msg._id || i} className="flex justify-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full">{msg.content}</span>
              </div>
            )
          }

          if (isVote) {
            const votes = msg.metadata?.votes || {}
            return (
              <div key={msg._id || i} className="flex justify-center my-4">
                <div className="glass-card p-4 w-full max-w-xs border-indigo-500/30">
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="animate-pulse">🤖</span> AI Suggestions
                  </p>
                  <div className="space-y-3">
                    {msg.metadata?.venues?.map((v, idx) => {
                      const voteCount = Object.values(votes).filter(name => name === v.name).length
                      const hasVoted = votes[me?._id] === v.name
                      const mapUrl = googleStaticMapUrl(Number(v.lat), Number(v.lng))
                      return (
                        <div key={idx} className={`bg-white/5 rounded-2xl overflow-hidden border ${hasVoted ? 'border-indigo-500' : 'border-white/5'}`}>
                          {mapUrl && (
                            <img src={mapUrl} alt={v.name} className="w-full h-24 object-cover opacity-80" />
                          )}
                          <div className="p-3">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-white">{v.name}</p>
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                                {v.walkMinutes} min walk
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{v.address}</p>
                            <p className="text-[10px] text-indigo-300/70 mt-0.5">{v.reason}</p>
                            <button 
                              onClick={() => submitVote(msg._id, v.name)}
                              className={`mt-3 w-full btn-secondary !py-1.5 !text-[10px] flex items-center justify-center gap-2 ${hasVoted ? '!bg-indigo-500 !text-white' : ''}`}
                            >
                              {hasVoted ? "✓ Voted" : "Vote"}
                              {voteCount > 0 && <span className="bg-white/20 px-1.5 rounded-full">{voteCount}</span>}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={msg._id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">
                  {room?.roomType === "group" 
                    ? room.members?.find(m => String(m._id) === String(msg.senderId))?.displayName || "Someone"
                    : otherUser?.displayName || "Friend"
                  }
                </span>
              )}
              <div
                className={`
                  max-w-[80%] relative group
                  ${isSticker || isVoice || isLocation ? "" : "px-4 py-2.5 rounded-2xl text-sm"}
                  ${isMe ? "bg-ember-500 text-white rounded-tr-none" : "bg-white/10 text-slate-100 rounded-tl-none border border-white/5"}
                  ${isSticker || isImage || isVoice || isLocation ? "!bg-transparent !border-0 !p-0" : ""}
                `}
                onDoubleClick={() => setReacting(reacting === msg._id ? null : msg._id)}
              >
                {isImage && <img src={msg.metadata?.url} alt="" className="rounded-2xl max-w-full h-auto border-2 border-white/10 shadow-lg" />}
                {isSticker && <div className="text-6xl animate-bounce-in">{msg.content}</div>}
                {isVoice && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 border border-white/5">
                    <span className="text-lg">🎙</span>
                    <audio src={msg.metadata?.url} controls className="h-8 max-w-[200px]" />
                  </div>
                )}
                {isLocation && msg.metadata?.lat && msg.metadata?.lng && (
                  <div className="w-64 overflow-hidden rounded-2xl bg-white/5 border border-white/10">
                    <img 
                      src={googleStaticMapUrl(Number(msg.metadata.lat), Number(msg.metadata.lng))}
                      alt="Shared Location"
                      className="w-full h-32 object-cover" 
                    />
                    <div className="p-3">
                      <p className="text-xs font-bold text-white mb-1">📍 {msg.metadata.placeName || "Shared Location"}</p>
                      {msg.metadata.address && <p className="mb-2 text-[10px] text-slate-400 line-clamp-2">{msg.metadata.address}</p>}
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${msg.metadata.lat},${msg.metadata.lng}`, '_blank')}
                        className="w-full btn-secondary !py-1.5 !text-[10px]"
                      >
                        Get Directions
                      </button>
                    </div>
                  </div>
                )}
                {!isImage && !isSticker && !isVoice && !isLocation && msg.content}

                {/* Reaction picker */}
                {reacting === msg._id && (
                  <div className="absolute -top-10 left-0 flex gap-1 bg-night-800 rounded-full px-2 py-1 border border-white/10 shadow-xl z-20 animate-scale-in">
                    {["❤️","😂","👍","😮","😢","🔥"].map(e => (
                      <button key={e} onClick={() => addReaction(msg._id, e)} className="text-lg hover:scale-125 transition-transform px-0.5">{e}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reactions display */}
              {Object.keys(reactions).length > 0 && (
                <div className={`flex gap-1 mt-1 ${isMe ? "mr-1" : "ml-1"}`}>
                  {Object.entries(
                    Object.values(reactions).reduce((acc, e) => { acc[e] = (acc[e]||0)+1; return acc }, {})
                  ).map(([emoji, count]) => (
                    <span key={emoji} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5 border border-white/5">
                      {emoji} {count > 1 && count}
                    </span>
                  ))}
                </div>
              )}

              {/* Read receipt */}
              {isMe && (
                <span className="text-[9px] mt-0.5 mr-1 text-slate-500">
                  {readBy.length > 0 ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{otherUser?.displayName}</span>
            <div className="flex gap-1 px-3 py-2 rounded-2xl bg-white/10 border border-white/5">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'150ms'}} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'300ms'}} />
            </div>
          </div>
        )}
      </main>

      {/* Stickers */}
      {showStickers && (
        <div className="absolute bottom-20 left-4 right-4 glass-strong p-4 rounded-3xl z-20 animate-fade-in-up border border-white/10 shadow-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Stickers</p>
          <div className="grid grid-cols-8 gap-2">
            {["🔥","👋","❤️","🤣","✨","📍","🎉","💯","😎","🙏","💪","🤝","☕","🍕","🎵","🌙","🫶","👀","🥳","😤","🤩","💀","🦋","🌈"].map((emoji, i) => (
              <button key={i} onClick={() => sendMessage({ content: emoji, msgType: "sticker" })} className="h-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform rounded-lg hover:bg-white/10">{emoji}</button>
            ))}
          </div>
        </div>
      )}
      <footer className="p-4 glass-card !rounded-none !border-x-0 !border-b-0 flex items-center gap-2">
        <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageUpload} />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-400 transition-colors">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
        <button onClick={() => setShowStickers(!showStickers)} className={`p-2 transition-colors ${showStickers ? "text-indigo-400" : "text-slate-400 hover:text-indigo-400"}`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        {/* Voice recording */}
        <button
          onMouseDown={startVoiceRecording}
          onMouseUp={stopVoiceRecording}
          onTouchStart={startVoiceRecording}
          onTouchEnd={stopVoiceRecording}
          className={`p-2 transition-colors ${recording ? 'text-red-400 animate-pulse' : 'text-slate-400 hover:text-indigo-400'}`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage({ content: input.trim() }) }} className="flex-1 flex gap-2">
          <input value={input} onChange={(e) => { setInput(e.target.value); emitTyping() }} placeholder="Say something..." className="input-glow flex-1 !py-3" autoComplete="off" />
          <button type="submit" disabled={!input.trim() || sending} className="btn-primary !p-3 aspect-square flex items-center justify-center">
            <svg className="h-5 w-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </footer>

      {/* Hangout Success Overlay */}
      {hangout && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-night-900/80 backdrop-blur-md animate-fade-in">
          <div className="text-center p-8 glass-strong rounded-4xl border border-indigo-500/30 animate-scale-in max-w-sm">
            <div className="text-6xl mb-6">✨ 🤝 ✨</div>
            <h2 className="text-3xl font-black text-white mb-2">It&apos;s a Match!</h2>
            <p className="text-slate-400 mb-8">
              Both of you agreed on <span className="text-indigo-400 font-bold">{hangout.venueName}</span>.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.venueName)}`, '_blank')}
                className="w-full btn-white !py-4"
              >
                Start Navigation
              </button>
              <button 
                onClick={() => setHangout(null)}
                className="w-full btn-secondary !py-3"
              >
                Keep Chatting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showSettings && room?.roomType === "group" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowSettings(false)}>
          <div className="glass-strong rounded-4xl border border-white/10 p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-white mb-6 text-left ml-1">Group Settings</h3>
              
              <div className="space-y-6">
                {/* Rename Section */}
                <form onSubmit={handleRenameGroup} className="text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Group Name</label>
                  <div className="flex gap-2">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="input-glow flex-1 !py-2.5 !text-sm"
                      placeholder="Enter new name..."
                    />
                    <button 
                      type="submit" 
                      disabled={renaming || newGroupName.trim() === room.name}
                      className="btn-primary !py-2.5 !px-4 !text-xs disabled:opacity-30"
                    >
                      {renaming ? "..." : "Save"}
                    </button>
                  </div>
                </form>

                {/* Invite Link Section */}
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Invite Friends</label>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400 truncate flex-1">
                      {typeof window !== 'undefined' ? `${window.location.origin}/join/${room.inviteCode}` : `/join/${room.inviteCode}`}
                    </p>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/join/${room.inviteCode}`;
                        navigator.clipboard.writeText(link);
                        alert("Invite link copied to clipboard!");
                      }}
                      className="shrink-0 text-indigo-400 font-bold text-[10px] uppercase tracking-wider hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Members Section */}
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Members ({room.members?.length})</label>
                  <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-hide pr-1">
                    {room.members?.map(m => (
                      <div key={m._id} className="flex items-center justify-between group/member">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0">
                            {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : m.displayName?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-200 truncate leading-none mb-0.5">{m.displayName} {String(m._id) === String(me?._id) && "(You)"}</p>
                            <p className="text-[9px] text-slate-500 font-medium truncate italic leading-none">@{m.username || 'member'}</p>
                          </div>
                        </div>
                        {/* Remove button: only creator can see it, and can't remove themselves */}
                        {String(room.creatorId) === String(me?._id) && String(m._id) !== String(me?._id) && (
                          <button 
                            onClick={() => handleRemoveMember(m._id)}
                            className="text-[10px] text-red-400 font-bold opacity-0 group-hover/member:opacity-100 transition-opacity px-2 py-1 rounded-md hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Member Section */}
                <div className="text-left pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Add Member</label>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">@</span>
                      <input
                        value={addMemberInput}
                        onChange={(e) => setAddMemberInput(e.target.value)}
                        className="input-glow !pl-7 !py-2 !text-xs w-full"
                        placeholder="username"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={addingMember || !addMemberInput.trim()}
                      className="btn-primary !py-2 !px-4 !text-[10px] disabled:opacity-30"
                    >
                      {addingMember ? "..." : "Add"}
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full btn-secondary !py-3"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
