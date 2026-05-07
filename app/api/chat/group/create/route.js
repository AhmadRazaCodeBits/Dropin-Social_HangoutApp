import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import { verifySessionToken } from "@/lib/session"

export async function POST(req) {
  try {
    await connectDB()

    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const name = body.name || "New Group"

    // Generate a simple 8-character alphanumeric invite code
    const inviteCode = Math.random().toString(36).substring(2, 10)

    const room = await ChatRoom.create({
      roomType: "group",
      name,
      inviteCode,
      members: [payload.userId],
      creatorId: payload.userId
    })

    return Response.json({ roomId: room._id })
  } catch (err) {
    console.error("Failed to create group:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
