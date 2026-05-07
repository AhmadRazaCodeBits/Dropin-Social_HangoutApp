import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import Signal from "@/models/Signal"
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const user = await User.findById(payload.userId)
    if (!user?.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 })

    // Stats
    const userCount = await User.countDocuments()
    const roomCount = await ChatRoom.countDocuments()
    const messageCount = await Message.countDocuments()
    const signalCount = await Signal.countDocuments()

    // Data
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select("-passwordHash")
    const recentRooms = await ChatRoom.find().sort({ updatedAt: -1 }).limit(10).populate("members", "displayName avatarUrl")
    
    return Response.json({
      stats: {
        users: userCount,
        rooms: roomCount,
        messages: messageCount,
        signals: signalCount
      },
      recentUsers,
      recentRooms
    })
  } catch (err) {
    console.error("Admin API Error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
