import { connectDB } from "@/lib/mongodb"
import Hangout from "@/models/Hangout"
import EtaTracking from "@/models/EtaTracking"
import { getWalkingEta } from "@/lib/maps"
import { pusherServer } from "@/lib/pusher"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  await connectDB()
  const { hangoutId } = await req.json()

  if (!hangoutId) {
    return badRequest("hangoutId is required")
  }

  const hangout = await Hangout.findById(hangoutId)
  if (!hangout) {
    return Response.json({ error: "Hangout not found" }, { status: 404 })
  }

  // Extract venue coordinates from hangout (already set by ai-spot)
  const [venueLng, venueLat] = hangout.venueLocation?.coordinates || []
  if (!Number.isFinite(venueLat) || !Number.isFinite(venueLng)) {
    return badRequest("Hangout missing valid venue location")
  }

  // Fetch all ETA tracking records for this hangout
  const etaRecords = await EtaTracking.find({ hangoutId })

  // Calculate and update ETAs for all members
  const etaResults = []
  for (const etaRow of etaRecords) {
    const { currentLat, currentLng } = etaRow

    let etaMinutes = null
    if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
      try {
        etaMinutes = await getWalkingEta(currentLat, currentLng, venueLat, venueLng)
      } catch (err) {
        console.error(`Failed to calculate ETA for user ${etaRow.userId}:`, err)
      }
    }

    if (Number.isFinite(etaMinutes)) {
      await EtaTracking.findByIdAndUpdate(etaRow._id, {
        etaMinutes,
        lastUpdated: new Date(),
      })

      etaResults.push({
        userId: String(etaRow.userId),
        etaMinutes,
      })

      // Broadcast to each user via Pusher (no coordinates exposed)
      if (pusherServer) {
        await pusherServer.trigger(`eta-${hangoutId}`, "eta:update", {
          userId: String(etaRow.userId),
          etaMinutes,
          arrived: false,
          lastUpdated: new Date().toISOString(),
        })
      }
    }
  }

  return Response.json({ etaCount: etaResults.length, results: etaResults })
}
