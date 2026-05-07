import { pusherServer } from "@/lib/pusher"
import { fuzzLocation } from "@/lib/geo"

export async function POST(req, { params }) {
  try {
    const { id: roomId } = params
    const { userId, lat, lng } = await req.json()

    if (!userId || lat === undefined || lng === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Apply the 400m fuzzy offset for privacy
    const fuzzed = fuzzLocation(lat, lng)

    if (pusherServer) {
      await pusherServer.trigger(`chat-${roomId}`, "location:update", {
        userId,
        lat: fuzzed.lat,
        lng: fuzzed.lng,
        timestamp: Date.now()
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error("POST /api/chat/[id]/location error:", err)
    return Response.json({ error: "Failed to broadcast location" }, { status: 500 })
  }
}
