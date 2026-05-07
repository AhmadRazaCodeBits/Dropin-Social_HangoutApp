import { connectDB } from "@/lib/mongodb"
import Message from "@/models/Message"
import ChatRoom from "@/models/ChatRoom"
import User from "@/models/User"
import { pusherServer } from "@/lib/pusher"

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { id: roomId } = params
    const { senderId, content, msgType = "text", metadata = {} } = await req.json()

    // Handle typing events — broadcast only, don't save
    if (msgType === "typing") {
      if (pusherServer && senderId) {
        await pusherServer.trigger(`chat-${roomId}`, "typing", { userId: senderId })
      }
      return Response.json({ ok: true })
    }

    if (!senderId || !content) {
      return Response.json({ error: "senderId and content are required" }, { status: 400 })
    }

    const message = await Message.create({
      roomId,
      senderId,
      content,
      msgType,
      metadata,
    })

    if (pusherServer) {
      const payload = {
        _id: message._id.toString(),
        roomId,
        senderId,
        content: msgType === "image" ? "Shared an image" : content,
        msgType,
        metadata: msgType === "image" ? { ...metadata, url: "FETCH_LATEST" } : metadata,
        createdAt: message.createdAt,
      };

      // Send to the room channel
      await pusherServer.trigger(`chat-${roomId}`, "message:new", payload);
      
      // Find other members and notify them globally
      const room = await ChatRoom.findById(roomId);
      if (room) {
        const sender = await User.findById(senderId).select("displayName");
        const senderName = sender?.displayName || "Someone";
        
        const others = room.members.filter(m => m.toString() !== senderId.toString());
        await Promise.all(others.map(targetId => 
          pusherServer.trigger(`signals-${targetId}`, "chat:new", {
            ...payload,
            senderName,
          })
        ));
      }
    }

    return Response.json({ message })
  } catch (error) {
    console.error("POST /api/chat/[id]/messages failed:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
