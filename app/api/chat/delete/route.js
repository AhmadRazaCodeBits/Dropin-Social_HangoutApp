import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import { verifySessionToken } from "@/lib/session"

export async function DELETE(req) {
  try {
    await connectDB()

    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await req.json()
    if (!roomId) {
      return Response.json({ error: "roomId is required" }, { status: 400 })
    }

    // Verify user is a member of this room
    const room = await ChatRoom.findById(roomId)
    if (!room || !room.members.some(m => m.toString() === payload.userId)) {
      return Response.json({ error: "Chat not found" }, { status: 404 })
    }

    // Delete all messages in this room
    await Message.deleteMany({ roomId })
    // Delete the room itself
    await ChatRoom.findByIdAndDelete(roomId)

    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/chat failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
