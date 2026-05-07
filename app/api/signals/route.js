import { connectDB } from "@/lib/mongodb"
import Signal from "@/models/Signal"
import Friendship from "@/models/Friendship"
import User from "@/models/User"
import { pusherServer } from "@/lib/pusher"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function GET(req) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId || userId === "undefined") {
      return Response.json({ signals: [] })
    }

    // Get friends to show their signals
    const friendships = await Friendship.find({ userId }).select("friendId")
    const friendIds = friendships.map((f) => f.friendId).filter(Boolean)
    
    // Add own ID
    const queryIds = [...friendIds, userId]

    const signals = await Signal.find({
      $or: [
        { userId: { $in: queryIds } },
        { isPublic: true }
      ],
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("userId", "displayName username avatarUrl")
      .lean()

    const normalized = signals.map((signal) => {
      const authorId = signal.userId?._id?.toString() || signal.userId?.toString()
      return {
        _id: signal._id.toString(),
        signalId: signal._id.toString(),
        authorId,
        vibe: signal.vibe,
        expiresAt: signal.expiresAt,
        isGhost: signal.isGhost,
        isPublic: signal.isPublic,
        isFriend: friendIds.includes(authorId),
        userDisplayName: signal.isGhost ? "Ghost friend" : (signal.userId?.displayName || signal.userId?.username || "Friend"),
        userAvatar: signal.isGhost ? null : signal.userId?.avatarUrl,
        lat: signal.location?.coordinates?.[1],
        lng: signal.location?.coordinates?.[0],
      }
    })

    return Response.json({ signals: normalized })
  } catch (error) {
    console.error("GET /api/signals failed:", error)
    return Response.json(
      { signals: [], error: "Failed to load signals" },
      { status: 500 } // Changed to 500 to catch actual issues, but with safe return
    )
  }
}

export async function POST(req) {
  try {
    await connectDB()

    const body = await req.json()
    const { userId, vibe, windowMinutes, radiusKm, isGhost, lat, lng } = body

    if (!userId || !vibe || !windowMinutes || !radiusKm || lat === undefined || lng === undefined) {
      return badRequest("Missing required signal fields")
    }

    const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000)

    const signal = await Signal.create({
      userId,
      vibe,
      windowMinutes,
      radiusKm,
      isGhost: Boolean(isGhost),
      isPublic: Boolean(body.isPublic),
      publicBio: body.publicBio || "",
      location: { type: "Point", coordinates: [lng, lat] },
      expiresAt,
    })

    // Notify friends
    const friendships = await Friendship.find({ friendId: userId }).select("userId")
    const triggerIds = friendships.map((f) => f.userId?.toString()).filter(Boolean)
    // Add self to trigger list so UI updates
    if (!triggerIds.includes(userId)) triggerIds.push(userId)

    const user = await User.findById(userId).select("displayName username").lean()
    const realName = user?.displayName || user?.username || "Friend"

    if (pusherServer) {
      const signalData = {
        signalId: signal._id.toString(),
        vibe,
        windowMinutes,
        expiresAt,
        isGhost: Boolean(isGhost),
        displayName: Boolean(isGhost) ? "Ghost friend" : realName,
        lat,
        lng,
        radiusKm,
        userId
      }

      const triggers = [
        pusherServer.trigger("signals-public", "signal:new", signalData)
      ]

      triggerIds.forEach(targetId => {
        triggers.push(pusherServer.trigger(`signals-${targetId}`, "signal:new", signalData))
      })

      await Promise.allSettled(triggers)
    }

    return Response.json({ success: true, signalId: signal._id })
  } catch (error) {
    console.error("POST /api/signals failed:", error)
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
