import { connectDB } from "@/lib/mongodb"
import Message from "@/models/Message"
import { pusherServer } from "@/lib/pusher"

export async function POST(req) {
  try {
    await connectDB()
    const { messageId, userId, venueName } = await req.json()

    if (!messageId || !userId || !venueName) {
      return Response.json({ error: "Missing fields" }, { status: 400 })
    }

    const message = await Message.findById(messageId)
    if (!message || message.msgType !== "venue_vote") {
      return Response.json({ error: "Invalid message" }, { status: 404 })
    }

    // Update votes in metadata
    const votes = message.metadata?.votes || {}
    votes[userId] = venueName
    
    message.metadata = { ...message.metadata, votes }
    message.markModified("metadata")
    await message.save()

    // Check for consensus
    const room = await (await import("@/models/ChatRoom")).default.findById(message.roomId)
    const membersCount = room.members.length
    const voteCount = Object.values(votes).filter(v => v === venueName).length

    if (voteCount >= membersCount) {
      const selectedVenue = message.metadata?.venues?.find((venue) => venue.name === venueName)
      // Create a Hangout
      const Hangout = (await import("@/models/Hangout")).default
      await Hangout.create({
        signalId: room.signalId,
        venueName,
        venueAddress: selectedVenue?.address,
        venueLocation: Number.isFinite(selectedVenue?.lat) && Number.isFinite(selectedVenue?.lng)
          ? { type: "Point", coordinates: [selectedVenue.lng, selectedVenue.lat] }
          : undefined,
        aiReason: selectedVenue?.reason,
        chatRoomId: message.roomId,
        members: room.members,
        vibe: room.vibe || "anything",
        startedAt: new Date()
      })

      if (pusherServer) {
        await pusherServer.trigger(`chat-${message.roomId}`, "hangout:started", {
          venueName,
          message: `It's a match! Both of you want to go to ${venueName}.`
        })
      }
    } else if (pusherServer) {
      await pusherServer.trigger(`chat-${message.roomId}`, "vote:update", {
        messageId,
        votes
      })
    }

    return Response.json({ success: true, votes })
  } catch (error) {
    console.error("Vote error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
