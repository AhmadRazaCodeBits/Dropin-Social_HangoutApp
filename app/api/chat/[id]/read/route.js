import { connectDB } from "@/lib/mongodb"
import Message from "@/models/Message"
import { pusherServer } from "@/lib/pusher"

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    const { userId } = await req.json()

    if (!userId) return Response.json({ error: "userId required" }, { status: 400 })

    // Mark all messages not from this user as read
    await Message.updateMany(
      { roomId, senderId: { $ne: userId }, "metadata.readBy": { $ne: userId } },
      { $addToSet: { "metadata.readBy": userId } }
    )

    if (pusherServer) {
      await pusherServer.trigger(`chat-${roomId}`, "messages:read", { userId })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("POST read failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
