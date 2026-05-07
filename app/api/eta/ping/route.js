import { connectDB } from "@/lib/mongodb"
import Hangout from "@/models/Hangout"
import EtaTracking from "@/models/EtaTracking"
import LocationPing from "@/models/LocationPing"
import { getWalkingEta } from "@/lib/maps"
import { haversine } from "@/lib/geo"
import { pusherServer } from "@/lib/pusher"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  await connectDB()

  const { hangoutId, userId, lat, lng, etaMinutes } = await req.json()

  if (!hangoutId || !userId) {
    return badRequest("hangoutId and userId are required")
  }

  const prev = await EtaTracking.findOne({ hangoutId, userId })
  let speedKmh = 0

  if (prev && prev.lastUpdated && Number.isFinite(lat) && Number.isFinite(lng)) {
    const distKm = haversine(prev.currentLat, prev.currentLng, lat, lng)
    const timeDeltaHrs = (Date.now() - new Date(prev.lastUpdated).getTime()) / 3600000
    speedKmh = timeDeltaHrs > 0 ? distKm / timeDeltaHrs : 0

    if (speedKmh > 200) {
      // Log suspicious ping for audit trail, but don't stop the user
      await LocationPing.create({
        userId,
        lat,
        lng,
        speedKmh,
        isSuspicious: true,
      })
      return Response.json({ flagged: true })
    }
  }

  // Log legitimate ping for audit trail
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    await LocationPing.create({
      userId,
      lat,
      lng,
      speedKmh,
      isSuspicious: false,
    })
  }

  const hangout = await Hangout.findById(hangoutId)
  if (!hangout) {
    return Response.json({ error: "Hangout not found" }, { status: 404 })
  }

  const [venueLng, venueLat] = hangout.venueLocation?.coordinates || []
  let nextEta = Number.isFinite(etaMinutes) ? etaMinutes : null

  if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(venueLat) && Number.isFinite(venueLng)) {
    nextEta = await getWalkingEta(lat, lng, venueLat, venueLng)
  }

  if (!Number.isFinite(nextEta)) {
    return badRequest("Provide etaMinutes or valid lat/lng coordinates")
  }

  const row = await EtaTracking.findOneAndUpdate(
    { hangoutId, userId },
    {
      $set: {
        currentLat: Number.isFinite(lat) ? lat : prev?.currentLat,
        currentLng: Number.isFinite(lng) ? lng : prev?.currentLng,
        etaMinutes: nextEta,
        arrived: nextEta <= 0,
        lastUpdated: new Date(),
      },
    },
    { upsert: true, new: true }
  )

  if (pusherServer) {
    await pusherServer.trigger(`eta-${hangoutId}`, "eta:update", {
      userId,
      etaMinutes: row.etaMinutes,
      arrived: row.arrived,
      lastUpdated: row.lastUpdated,
    })
  }

  return Response.json({ etaMinutes: row.etaMinutes })
}
