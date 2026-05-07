import { connectDB } from "@/lib/mongodb"
import EtaTracking from "@/models/EtaTracking"
import Hangout from "@/models/Hangout"
import { pusherServer } from "@/lib/pusher"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  await connectDB()

  const { hangoutId, userId } = await req.json()

  if (!hangoutId || !userId) {
    return badRequest("hangoutId and userId are required")
  }

  await EtaTracking.findOneAndUpdate(
    { hangoutId, userId },
    {
      $set: {
        etaMinutes: 0,
        arrived: true,
        lastUpdated: new Date(),
      },
    },
    { upsert: true, new: true }
  )

  const hangout = await Hangout.findById(hangoutId).select("members")
  const memberIds = (hangout?.members || []).map((id) => String(id))

  const arrivalRows = await EtaTracking.find({
    hangoutId,
    userId: { $in: memberIds },
    arrived: true,
  }).select("userId")

  const arrivedIds = new Set(arrivalRows.map((row) => String(row.userId)))
  const allArrived = memberIds.length > 0 && memberIds.every((id) => arrivedIds.has(id))

  if (pusherServer) {
    await pusherServer.trigger(`eta-${hangoutId}`, "eta:update", {
      userId,
      etaMinutes: 0,
      arrived: true,
      allArrived,
    })
  }

  return Response.json({ ok: true, allArrived })
}
