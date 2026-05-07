import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import User from "@/models/User"
import { pusherServer } from "@/lib/pusher"

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    const payload = await req.json()
    const { senderId, type, action = "incoming" } = payload

    if (!senderId || !type) {
      return Response.json({ error: "senderId and type are required" }, { status: 400 })
    }

    const room = await ChatRoom.findById(roomId)
    if (!room) {
      return Response.json({ error: "Chat room not found" }, { status: 404 })
    }

    const sender = await User.findById(senderId).select("displayName avatarUrl")
    const otherMembers = room.members.filter(m => m.toString() !== senderId.toString())
    
    if (pusherServer && otherMembers.length > 0) {
      const pusherPayload = {
        roomId,
        type,
        action,
        sender: {
          _id: senderId,
          displayName: sender?.displayName || "Someone",
          avatarUrl: sender?.avatarUrl
        }
      }
      
      // Trigger for each member
      // Use 'call:incoming' for new calls, and 'call:action' for signaling joins/leaves
      const eventName = ["cancel", "decline", "end", "join"].includes(action) ? "call:action" : "call:incoming"
      
      await Promise.all(otherMembers.map(targetId => 
        pusherServer.trigger(`signals-${targetId}`, eventName, pusherPayload)
      ))
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("POST /api/chat/[id]/call failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
