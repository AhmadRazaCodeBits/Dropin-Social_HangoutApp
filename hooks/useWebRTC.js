"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Peer from "simple-peer"
import { getPusherClient } from "@/lib/pusher"

// Simple-peer needs process and Buffer in the browser
if (typeof window !== "undefined") {
  window.global = window.global || window;
  window.process = window.process || { env: {} };
  window.Buffer = window.Buffer || require("buffer").Buffer;
}

export function useWebRTC(roomId, me, isVideo = true) {
  const [localStream, setLocalStream] = useState(null)
  const [peers, setPeers] = useState([]) // Array of { peerId, peer, stream, displayName }
  const peersRef = useRef([]) // Internal ref to keep track of peers without re-renders
  
  const pusherRef = useRef(null)
  const channelRef = useRef(null)

  const stopTracks = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
  }, [localStream])

  // Helper to send signals via API
  const sendSignal = async (targetUserId, signal) => {
    try {
      await fetch(`/api/chat/${roomId}/call/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          senderId: me._id,
          signal
        })
      })
    } catch (err) {
      console.error("Failed to send signal:", err)
    }
  }

  const createPeer = (targetUserId, stream, caller = false, displayName = "Someone") => {
    const peer = new Peer({
      initiator: caller,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ]
      }
    })

    peer.on("signal", signal => {
      sendSignal(targetUserId, signal)
    })

    peer.on("stream", remoteStream => {
      setPeers(prev => prev.map(p => 
        p.peerId === targetUserId ? { ...p, stream: remoteStream } : p
      ))
    })

    peer.on("error", err => {
      console.error("Peer error:", err)
      removePeer(targetUserId)
    })

    peer.on("close", () => {
      removePeer(targetUserId)
    })

    return peer
  }

  const removePeer = (targetUserId) => {
    const peerObj = peersRef.current.find(p => p.peerId === targetUserId)
    if (peerObj) {
      peerObj.peer.destroy()
    }
    const filtered = peersRef.current.filter(p => p.peerId !== targetUserId)
    peersRef.current = filtered
    setPeers(filtered)
  }

  useEffect(() => {
    if (!me || !roomId) return

    let mounted = true

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true
        })
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        setLocalStream(stream)

        const pusher = getPusherClient()
        pusherRef.current = pusher
        
        // Subscribe to private signal channel
        const signalChannel = pusher.subscribe(`signals-${me._id}`)
        channelRef.current = signalChannel

        // Listen for incoming signals
        signalChannel.bind("call:signal", (data) => {
          if (data.roomId !== roomId) return
          
          const existingPeer = peersRef.current.find(p => p.peerId === data.senderId)
          if (existingPeer) {
            existingPeer.peer.signal(data.signal)
          } else {
            // New peer sending signal (probably an offer)
            const newPeer = createPeer(data.senderId, stream, false)
            newPeer.signal(data.signal)
            
            const peerObj = { peerId: data.senderId, peer: newPeer, stream: null }
            peersRef.current.push(peerObj)
            setPeers([...peersRef.current])
          }
        })

        // Broadcast presence so others can initiate connections
        // In a group, everyone else will see this and start a peer connection with us
        await fetch(`/api/chat/${roomId}/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: me._id, type: isVideo ? "video" : "voice", action: "join" })
        })

      } catch (err) {
        console.error("WebRTC init failed:", err)
      }
    }

    init()

    return () => {
      mounted = false
      stopTracks()
      peersRef.current.forEach(p => p.peer.destroy())
      if (pusherRef.current && channelRef.current) {
        channelRef.current.unbind_all()
        pusherRef.current.unsubscribe(`signals-${me._id}`)
      }
    }
  }, [roomId, me?._id, isVideo])

  // Function to initiate connection with a specific user (used when we see someone join)
  const connectToUser = useCallback((targetUserId, displayName) => {
    if (!localStream) return
    if (peersRef.current.find(p => p.peerId === targetUserId)) return

    const peer = createPeer(targetUserId, localStream, true, displayName)
    const peerObj = { peerId: targetUserId, peer, stream: null, displayName }
    peersRef.current.push(peerObj)
    setPeers([...peersRef.current])
  }, [localStream])

  return {
    localStream,
    peers,
    connectToUser,
    stopTracks
  }
}
