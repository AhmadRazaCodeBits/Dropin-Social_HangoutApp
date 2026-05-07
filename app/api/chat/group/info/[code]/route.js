import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"

export async function GET(req, { params }) {
  try {
    await connectDB()
    const { code } = params

    const room = await ChatRoom.findOne({ inviteCode: code, roomType: "group" })
      .select("name members")
      .lean()

    if (!room) {
      return Response.json({ error: "Group not found" }, { status: 404 })
    }

    return Response.json({ 
      name: room.name, 
      memberCount: room.members.length 
    })
  } catch (err) {
    console.error("Failed to fetch group info:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
