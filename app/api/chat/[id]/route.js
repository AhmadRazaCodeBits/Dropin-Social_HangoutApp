import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import Signal from "@/models/Signal"

export async function GET(req, { params }) {
  try {
    await connectDB()
    const { id } = params

    const room = await ChatRoom.findById(id)
      .populate("members", "displayName username avatarUrl")
      .populate("signalId")
      .lean()

    if (!room) {
      return Response.json({ error: "Chat room not found" }, { status: 404 })
    }

    const messages = await Message.find({ roomId: id })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()

    return Response.json({ room, messages })
  } catch (error) {
    console.error("GET /api/chat/[id] failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
