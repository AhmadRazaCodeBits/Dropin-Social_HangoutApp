import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import { verifySessionToken } from "@/lib/session"

export async function PATCH(req, { params }) {
  try {
    await connectDB()

    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = params
    const { name } = await req.json()

    if (!name || name.trim() === "") {
      return Response.json({ error: "Name cannot be empty" }, { status: 400 })
    }

    const room = await ChatRoom.findOneAndUpdate(
      { _id: id, roomType: "group", members: payload.userId },
      { name: name.trim() },
      { new: true }
    )

    if (!room) return Response.json({ error: "Group not found or unauthorized" }, { status: 404 })

    return Response.json({ success: true, room })
  } catch (err) {
    console.error("Failed to rename group:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
