import { connectDB } from "@/lib/mongodb"
import Hangout from "@/models/Hangout"
import User from "@/models/User"
import EtaTracking from "@/models/EtaTracking"
import { pusherServer } from "@/lib/pusher"

function getDurationMinutes(startedAt, endedAt) {
  const startTs = new Date(startedAt).getTime()
  const endTs = endedAt ? new Date(endedAt).getTime() : Date.now()
  return Math.max(1, Math.round((endTs - startTs) / 60000))
}

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function GET(_req, { params }) {
  await connectDB()

  const hangout = await Hangout.findById(params.id).lean()
  if (!hangout) {
    return Response.json({ error: "Hangout not found" }, { status: 404 })
  }

  const users = await User.find({ _id: { $in: hangout.members || [] } })
    .select("displayName username avatarUrl")
    .lean()

  const etaRows = await EtaTracking.find({ hangoutId: hangout._id }).lean()

  const etaByUser = new Map(etaRows.map((row) => [String(row.userId), row]))

  const members = users.map((user) => {
    const eta = etaByUser.get(String(user._id))
    return {
      userId: String(user._id),
      displayName: user.displayName || user.username || "Friend",
      avatarUrl: user.avatarUrl || "",
      etaMinutes: eta?.etaMinutes ?? null,
      arrived: Boolean(eta?.arrived),
    }
  })

  return Response.json({
    hangout: {
      id: String(hangout._id),
      venue: {
        name: hangout.venueName,
        address: hangout.venueAddress,
        lat: hangout.venueLocation?.coordinates?.[1],
        lng: hangout.venueLocation?.coordinates?.[0],
      },
      vibe: hangout.vibe || "anything",
      aiReason: hangout.aiReason || "AI picked this for fair walking distance and matching energy.",
      members,
      startedAt: hangout.startedAt,
      endedAt: hangout.endedAt,
      durationMinutes: getDurationMinutes(hangout.startedAt, hangout.endedAt),
      aiMemory: hangout.aiMemory || "",
    },
  })
}

export async function PATCH(req, { params }) {
  await connectDB()

  const { ended, aiMemory } = await req.json()

  const hangout = await Hangout.findById(params.id)
  if (!hangout) {
    return Response.json({ error: "Hangout not found" }, { status: 404 })
  }

  if (ended === true) {
    hangout.endedAt = new Date()
  }

  if (typeof aiMemory === "string") {
    hangout.aiMemory = aiMemory.trim()
  }

  if (ended !== true && typeof aiMemory !== "string") {
    return badRequest("No valid fields to update")
  }

  await hangout.save()

  if (pusherServer) {
    await pusherServer.trigger(`eta-${params.id}`, "hangout:ended", {
      hangoutId: params.id,
      endedAt: hangout.endedAt,
    })
  }

  return Response.json({
    hangout: {
      id: String(hangout._id),
      endedAt: hangout.endedAt,
      aiMemory: hangout.aiMemory || "",
    },
  })
}
