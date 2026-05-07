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

    const { inviteCode } = await req.json()
    if (!inviteCode) return Response.json({ error: "Missing invite code" }, { status: 400 })

    const room = await ChatRoom.findOne({ inviteCode, roomType: "group" })
    if (!room) return Response.json({ error: "Invalid invite link" }, { status: 404 })

    // Add user to members if not already there
    if (!room.members.includes(payload.userId)) {
      room.members.push(payload.userId)
      await room.save()
    }

    return Response.json({ roomId: room._id })
  } catch (err) {
    console.error("Failed to join group:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
