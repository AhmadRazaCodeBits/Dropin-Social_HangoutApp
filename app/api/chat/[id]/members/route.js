import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import User from "@/models/User"
import { verifySessionToken } from "@/lib/session"

// ADD MEMBER
export async function POST(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { username } = await req.json()
    if (!username) return Response.json({ error: "Username required" }, { status: 400 })

    const room = await ChatRoom.findById(roomId)
    if (!room || room.roomType !== "group") return Response.json({ error: "Group not found" }, { status: 404 })

    // Check if current user is in the group (or is creator - but here we let any member add others for simplicity)
    if (!room.members.includes(payload.userId)) {
      return Response.json({ error: "Not a member of this group" }, { status: 403 })
    }

    const userToAdd = await User.findOne({ username: username.toLowerCase() })
    if (!userToAdd) return Response.json({ error: "User not found" }, { status: 404 })

    if (room.members.includes(userToAdd._id)) {
      return Response.json({ error: "User is already a member" }, { status: 400 })
    }

    room.members.push(userToAdd._id)
    await room.save()

    return Response.json({ success: true })
  } catch (err) {
    console.error("POST /api/chat/[id]/members error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// REMOVE MEMBER
export async function DELETE(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { userId: targetUserId } = await req.json()
    if (!targetUserId) return Response.json({ error: "User ID required" }, { status: 400 })

    const room = await ChatRoom.findById(roomId)
    if (!room || room.roomType !== "group") return Response.json({ error: "Group not found" }, { status: 404 })

    // Only the creator can remove members
    if (String(room.creatorId) !== String(payload.userId)) {
      return Response.json({ error: "Only the group creator can remove members" }, { status: 403 })
    }

    if (String(targetUserId) === String(room.creatorId)) {
      return Response.json({ error: "Creator cannot be removed from the group" }, { status: 400 })
    }

    room.members = room.members.filter(m => String(m) !== String(targetUserId))
    await room.save()

    return Response.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/chat/[id]/members error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
