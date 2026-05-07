import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import User from "@/models/User"
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')

    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin || admin.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 })

    if (roomId) {
      const messages = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(100)
      return Response.json({ messages })
    }

    const rooms = await ChatRoom.find().sort({ updatedAt: -1 }).limit(50)
    return Response.json({ rooms })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    await connectDB()
    const { type, id } = await req.json() // type: 'room' or 'message'

    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin || admin.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 })

    if (type === 'message') {
      await Message.findByIdAndDelete(id)
    } else if (type === 'room') {
      await Promise.all([
        ChatRoom.findByIdAndDelete(id),
        Message.deleteMany({ roomId: id })
      ])
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
