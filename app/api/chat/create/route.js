import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Message from "@/models/Message"
import { pusherServer } from "@/lib/pusher"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  try {
    await connectDB()
    const body = await req.json()
    const { signalId, initiatorId, targetId } = body

    if (!signalId || !initiatorId || !targetId) {
      return badRequest("signalId, initiatorId and targetId are required")
    }

    if (String(initiatorId) === String(targetId)) {
      return badRequest("You cannot start a chat with yourself")
    }

    const room = await ChatRoom.create({
      signalId,
      roomType: "dm",
      members: [initiatorId, targetId],
    })

    await Message.create({
      roomId: room._id,
      senderId: initiatorId,
      msgType: "system",
      content: "Chat started - say hi!",
    })

    if (pusherServer) {
      try {
        await pusherServer.trigger(`signals-${targetId}`, "chat:new", {
          roomId: room._id.toString(),
          initiatorId,
        })
      } catch (pusherErr) {
        console.error("Pusher trigger failed in chat creation:", pusherErr)
        // We don't want to fail the whole request if Pusher fails
      }
    }

    return Response.json({ roomId: room._id })
  } catch (error) {
    console.error("POST /api/chat/create failed:", error)
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
