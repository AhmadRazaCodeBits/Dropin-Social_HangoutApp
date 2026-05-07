import { getNearbyPlaces } from "@/lib/maps"
import { generateOpenRouterJSON, getOpenRouterModelName } from "@/lib/openrouter"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function vibeToPlaceType(vibe) {
  const map = {
    coffee: "cafe",
    chai: "cafe",
    food: "restaurant",
    burger: "restaurant",
    pizza: "restaurant",
    dessert: "bakery",
    drinks: "bar",
    chill: "cafe",
    walk: "park",
    anything: "establishment",
  }
  return map[vibe] ?? "establishment"
}

function maxDistance(members, lat, lng) {
  return Math.max(
    ...members.map((m) => Math.sqrt(Math.pow(m.lat - lat, 2) + Math.pow(m.lng - lng, 2)) * 111)
  )
}

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  try {
    const { members, vibe, windowMinutes } = await req.json()

    if (!Array.isArray(members) || members.length === 0) {
      return badRequest("members must be a non-empty array")
    }

    const hasInvalidMember = members.some(
      (m) => !m || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)
    )

    if (hasInvalidMember) {
      return badRequest("each member must include numeric lat and lng")
    }

    if (!vibe || !Number.isFinite(windowMinutes)) {
      return badRequest("vibe and windowMinutes are required")
    }

    const centroidLat = members.reduce((sum, m) => sum + m.lat, 0) / members.length
    const centroidLng = members.reduce((sum, m) => sum + m.lng, 0) / members.length

    // Use a slightly larger radius for AI to have more options
    const places = await getNearbyPlaces(centroidLat, centroidLng, vibeToPlaceType(vibe), 2000)

    const prompt = `
You are DropIn's AI hangout coordinator. A group of ${members.length} friends want to hang out.
Current time: ${new Date().toLocaleTimeString()}
Vibe: ${vibe}
Time window: ${windowMinutes} minutes

Available nearby venues (metadata included):
${places.map((p, i) => `${i + 1}. ${p.name}
   - Address: ${p.vicinity ?? "Unknown"}
   - Rating: ${p.rating ?? "N/A"} (${p.userRatingsTotal ?? 0} reviews)
   - Price Level: ${p.priceLevel ?? "N/A"}
   - Types: ${p.types?.join(", ") ?? "N/A"}
   - Open Now: ${p.openNow ? "Yes" : "No"}`).join("\n")}

Task:
Pick the top 3 venues that BEST fit the vibe "${vibe}" and are currently open.
For each, provide:
- name: exact venue name
- address: exact address
- reason: a catchy, one-sentence reason why it's perfect for this group and vibe.
- walkMinutes: estimated walking time from the group's center (assume 5 km/h).

Respond ONLY with a valid JSON object:
{
  "picks": [
    { "name": "venue name", "address": "venue address", "reason": "reason", "walkMinutes": 8 }
  ]
}
`

    const data = await generateOpenRouterJSON(prompt)

    return Response.json({ model: getOpenRouterModelName(), ...data })
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to generate AI spot recommendations" },
      { status: 500 }
    )
  }
}
