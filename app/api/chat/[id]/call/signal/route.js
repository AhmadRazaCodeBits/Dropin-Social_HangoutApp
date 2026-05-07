import { pusherServer } from "@/lib/pusher"

export async function POST(req, { params }) {
  try {
    const { id: roomId } = params
    const { targetUserId, senderId, signal } = await req.json()

    if (!targetUserId || !senderId || !signal) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (pusherServer) {
      await pusherServer.trigger(`signals-${targetUserId}`, "call:signal", {
        roomId,
        senderId,
        signal
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("POST /api/chat/[id]/call/signal failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
