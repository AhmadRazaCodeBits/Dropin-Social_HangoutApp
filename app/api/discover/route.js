import { connectDB } from "@/lib/mongodb"
import Signal from "@/models/Signal"
import PublicProfile from "@/models/PublicProfile"
import Block from "@/models/Block"

const VIBE_GRAPH = {
  drinks: { drinks: 100, food: 70, chill: 60, coffee: 40, walk: 20 },
  chai: { chai: 100, coffee: 90, chill: 75, food: 65, dessert: 60, drinks: 35, walk: 45 },
  coffee: { coffee: 100, chai: 90, chill: 75, food: 65, dessert: 65, drinks: 40, walk: 50 },
  burger: { burger: 100, food: 90, pizza: 75, drinks: 60, coffee: 40, chill: 45, walk: 20 },
  pizza: { pizza: 100, food: 90, burger: 75, drinks: 65, chill: 45, coffee: 35, walk: 20 },
  dessert: { dessert: 100, coffee: 70, chai: 65, food: 60, chill: 55, drinks: 35, walk: 35 },
  food: { food: 100, burger: 90, pizza: 90, drinks: 70, coffee: 65, chai: 65, dessert: 60, chill: 60, walk: 30 },
  chill: { chill: 100, coffee: 75, chai: 75, drinks: 60, food: 60, dessert: 55, walk: 65 },
  walk: { walk: 100, chill: 65, coffee: 50, chai: 45, food: 30, dessert: 30, drinks: 20 },
  anything: { drinks: 85, chai: 85, coffee: 85, burger: 85, pizza: 85, food: 85, dessert: 85, chill: 85, walk: 85 },
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  await connectDB()
  const { lat, lng, vibe, radiusKm, userId } = await req.json()

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !vibe || !Number.isFinite(radiusKm) || !userId) {
    return badRequest("lat, lng, vibe, radiusKm, and userId are required")
  }

  const blocks = await Block.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  })

  const blockedIds = blocks.map((b) =>
    b.blockerId.toString() === userId ? b.blockedId.toString() : b.blockerId.toString()
  )

  const signals = await Signal.find({
    isPublic: true,
    status: "active",
    expiresAt: { $gt: new Date() },
    userId: { $nin: [...blockedIds, userId] },
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).populate("userId", "username")

  const results = await Promise.all(
    signals.map(async (s) => {
      const profile = await PublicProfile.findOne({ userId: s.userId._id })
      const coords = s.location.coordinates
      const distKm = haversine(lat, lng, coords[1], coords[0])

      return {
        signalId: s._id,
        userId: s.userId._id,
        displayName: profile?.displayName ?? s.userId.username,
        vibe: s.vibe,
        publicBio: s.publicBio,
        communityRating: profile?.communityRating ?? 5.0,
        isIdVerified: profile?.isIdVerified ?? false,
        matchScore: VIBE_GRAPH[vibe]?.[s.vibe] ?? 30,
        distanceKm: Math.round(distKm * 10) / 10,
      }
    })
  )

  results.sort((a, b) => b.matchScore - a.matchScore)

  return Response.json({ results })
}
