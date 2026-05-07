import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()

    // Auth — same pattern as /api/auth/me
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = payload.userId

    const rooms = await ChatRoom.find({ members: userId })
      .populate("members", "displayName avatarUrl")
      .populate("signalId", "vibe")
      .sort({ updatedAt: -1 })
      .lean()

    // Get last message for each room
    const roomsWithLastMsg = await Promise.all(rooms.map(async (room) => {
      const lastMessage = await Message.findOne({ roomId: room._id })
        .sort({ createdAt: -1 })
        .lean()

      const otherMember = room.roomType === "dm" 
        ? room.members.find(m => String(m._id) !== String(userId))
        : null

      return {
        _id: room._id,
        roomType: room.roomType || "dm",
        name: room.name,
        memberCount: room.members.length,
        otherUser: otherMember || { displayName: room.name || "Group" },
        vibe: room.signalId?.vibe || "anything",
        lastMessage: lastMessage ? {
          content: lastMessage.msgType === "image" ? "📷 Photo" :
                   lastMessage.msgType === "sticker" ? lastMessage.content :
                   lastMessage.msgType === "venue_vote" ? "🤖 AI Suggestions" :
                   lastMessage.msgType === "voice" ? "🎙 Voice message" :
                   lastMessage.content,
          createdAt: lastMessage.createdAt,
          isMe: String(lastMessage.senderId) === String(userId)
        } : null,
        updatedAt: room.updatedAt
      }
    }))

    return Response.json({ rooms: roomsWithLastMsg })
  } catch (error) {
    console.error("GET /api/chat failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
