"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useWebRTC } from "@/hooks/useWebRTC"
import { getPusherClient } from "@/lib/pusher"

export function CallOverlay({ type, otherUser, onEnd, incoming, roomId, me }) {
  const [status, setStatus] = useState(incoming ? "incoming" : "ringing")
  const isVideo = type === "video"
  
  // Custom WebRTC Hook
  const { localStream, peers, connectToUser, stopTracks } = useWebRTC(roomId, me, isVideo)

  // Audio/Video Mute States
  const [micActive, setMicActive] = useState(true)
  const [camActive, setCamActive] = useState(isVideo)

  const handleEnd = useCallback(async () => {
    // Notify others that we are ending/declining/cancelling
    try {
      const action = status === "ringing" ? "cancel" : status === "incoming" ? "decline" : "end"
      await fetch(`/api/chat/${roomId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me._id, type, action })
      })
    } catch (err) {
      console.error("Failed to send end signal:", err)
    }
    onEnd()
  }, [status, roomId, me._id, type, onEnd])

  useEffect(() => {
    if (status === "ringing") {
      const timer = setTimeout(() => {
        setStatus("connected")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = micActive)
      localStream.getVideoTracks().forEach(t => t.enabled = camActive)
    }
  }, [micActive, camActive, localStream])

  // Cleanup tracks on unmount
  useEffect(() => {
    return () => stopTracks()
  }, [stopTracks])

  // Handle incoming 'join' signals from others to connect
  useEffect(() => {
    if (status === "connected") {
      const pusher = getPusherClient()
      const signalChannel = pusher.subscribe(`signals-${me._id}`)
      
      signalChannel.bind("call:action", (data) => {
        if (data.roomId === roomId) {
          if (data.action === "join") {
            connectToUser(data.sender._id, data.sender.displayName)
          } else if (["cancel", "decline", "end"].includes(data.action)) {
            // If it's a 1-on-1 and the other person leaves, end the call
            // For groups, we'd only end if we were the last ones, but for now simple end
            onEnd()
          }
        }
      })

      return () => {
        signalChannel.unbind("call:action")
      }
    }
  }, [status, roomId, me._id, connectToUser, onEnd])

  const toggleMic = () => setMicActive(!micActive)
  const toggleCam = () => setCamActive(!camActive)

  if (status === "incoming") {
    return (
      <div className="fixed inset-0 z-[100] bg-night-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in p-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="text-center mb-16 relative">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping scale-150" />
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mx-auto mb-8 p-1 shadow-2xl shadow-indigo-500/40 relative">
              <div className="h-full w-full rounded-full bg-night-900 flex items-center justify-center text-5xl overflow-hidden">
                 {otherUser?.avatarUrl ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : "👤"}
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-3 drop-shadow-lg">{otherUser?.displayName || "Friend"}</h2>
          <p className="text-indigo-300 font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">
            Incoming {type} call
          </p>
        </div>
        
        <div className="flex gap-8 sm:gap-12 items-center relative">
          <button onClick={handleEnd} className="group flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-full bg-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/20 transition-all hover:scale-105 active:scale-95">
              <svg className="h-8 w-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.45 2.33.69 3.58.69a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.69 3.57a1 1 0 01-.27 1.11l-2.2 2.22z" />
              </svg>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decline</span>
          </button>
          
          <button onClick={() => setStatus("connected")} className="group flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-bounce transition-all hover:scale-105 active:scale-95">
              <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.2a1.02 1.02 0 00.24-1.02c-.37-1.12-.57-2.32-.57-3.57 0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
              </svg>
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Accept</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in overflow-hidden">
      {status === "connected" ? (
        <div className="flex-1 relative flex flex-wrap items-center justify-center p-4 gap-4 bg-night-950">
          
          {/* Remote Streams Grid */}
          <div className={`grid w-full h-full gap-4 ${peers.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'} p-4`}>
             {peers.length === 0 && (
               <div className="flex flex-col items-center justify-center text-slate-500 col-span-full">
                  <div className="h-16 w-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Waiting for others...</p>
               </div>
             )}
             {peers.map((peerObj) => (
               <VideoBox 
                 key={peerObj.peerId} 
                 stream={peerObj.stream} 
                 displayName={peerObj.displayName || "Participant"} 
                 isRemote={true} 
               />
             ))}
          </div>

          {/* Local Stream (PIP) */}
          <div className="absolute bottom-24 right-6 w-32 sm:w-48 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-20 group transition-transform hover:scale-105">
             <VideoBox stream={localStream} displayName="You" isRemote={false} muted={true} />
             {!camActive && (
               <div className="absolute inset-0 bg-night-800 flex items-center justify-center text-slate-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </div>
             )}
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full bg-night-900/80 backdrop-blur-xl border border-white/10 shadow-2xl z-30">
             <button 
               onClick={toggleMic}
               className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${micActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white shadow-glow-rose'}`}
             >
               {micActive ? (
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
               ) : (
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
               )}
             </button>

             {isVideo && (
               <button 
                 onClick={toggleCam}
                 className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${camActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white shadow-glow-rose'}`}
               >
                 {camActive ? (
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                 ) : (
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                 )}
               </button>
             )}

             <button 
               onClick={handleEnd}
               className="h-14 w-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-500/40 hover:scale-110 active:scale-95 transition-transform"
             >
               <svg className="h-7 w-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.45 2.33.69 3.58.69a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.69 3.57a1 1 0 01-.27 1.11l-2.2 2.22z" />
               </svg>
             </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-night-950 p-6 text-center">
           <div className="relative mb-10">
             <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse scale-150" />
             <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 animate-pulse shadow-2xl shadow-indigo-500/20 relative">
               <div className="h-full w-full rounded-full bg-night-900 flex items-center justify-center text-5xl overflow-hidden">
                  {otherUser?.avatarUrl ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : "👤"}
               </div>
             </div>
           </div>
           <h2 className="text-3xl font-black text-white mb-2">{otherUser?.displayName || "Friend"}</h2>
           <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">
             <span>Ringing</span>
             <span className="flex gap-1">
               <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
               <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
               <span className="animate-bounce" style={{ animationDelay: '400ms' }}>.</span>
             </span>
           </div>
           
           <button 
             onClick={handleEnd} 
             className="mt-24 h-20 w-20 rounded-full bg-rose-500 flex items-center justify-center shadow-2xl shadow-rose-500/40 transition-transform hover:scale-110 active:scale-95 group"
           >
             <svg className="h-10 w-10 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
               <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.45 2.33.69 3.58.69a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.24 2.46.69 3.57a1 1 0 01-.27 1.11l-2.2 2.22z" />
             </svg>
           </button>
        </div>
      )}
    </div>
  )
}

function VideoBox({ stream, displayName, isRemote, muted = false }) {
  const videoRef = useRef()

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className={`relative h-full w-full bg-night-900 rounded-3xl overflow-hidden shadow-inner ${isRemote ? 'animate-scale-in' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover scale-x-[-1]"
      />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{displayName}</span>
        {!isRemote && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-glow-teal" />}
      </div>
    </div>
  )
}
