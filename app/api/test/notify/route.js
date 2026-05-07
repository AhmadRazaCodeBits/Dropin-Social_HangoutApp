import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { pusherServer } from "@/lib/pusher"

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") || "message"

    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 })

    if (pusherServer) {
      if (type === "message") {
        await pusherServer.trigger(`signals-${userId}`, "chat:new", {
          _id: "test-msg-" + Date.now(),
          roomId: "test-room",
          senderName: "Test Bot",
          content: "This is a real-time test message! 🚀",
          createdAt: new Date()
        })
      } else if (type === "call") {
        await pusherServer.trigger(`signals-${userId}`, "call:incoming", {
          roomId: "test-room",
          type: "video",
          sender: {
            _id: "test-sender",
            displayName: "Test Caller",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Caller"
          }
        })
      }
    }

    return Response.json({ success: true, message: `Triggered ${type} notification for ${userId}` })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
