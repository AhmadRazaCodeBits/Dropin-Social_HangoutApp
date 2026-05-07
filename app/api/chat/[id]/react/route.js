import { connectDB } from "@/lib/mongodb"
import Message from "@/models/Message"
import { pusherServer } from "@/lib/pusher"

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    const { messageId, userId, emoji } = await req.json()

    if (!messageId || !userId || !emoji) {
      return Response.json({ error: "messageId, userId, and emoji are required" }, { status: 400 })
    }

    const msg = await Message.findById(messageId)
    if (!msg) return Response.json({ error: "Message not found" }, { status: 404 })

    const reactions = msg.metadata?.reactions || {}
    const userReaction = reactions[userId]

    // Toggle: if same emoji, remove. Otherwise set new one.
    if (userReaction === emoji) {
      delete reactions[userId]
    } else {
      reactions[userId] = emoji
    }

    await Message.updateOne({ _id: messageId }, { $set: { "metadata.reactions": reactions } })

    if (pusherServer) {
      await pusherServer.trigger(`chat-${roomId}`, "reaction:update", {
        messageId, reactions
      })
    }

    return Response.json({ success: true, reactions })
  } catch (error) {
    console.error("POST react failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
