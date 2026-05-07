import { getSmartPlaceCandidates } from "@/lib/maps"
import { rankPlacesWithOpenRouter } from "@/lib/openrouter"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get("lat"))
    const lng = Number(searchParams.get("lng"))
    const query = searchParams.get("query") || ""
    const limit = Math.min(Number(searchParams.get("limit")) || 8, 12)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return badRequest("lat and lng are required")
    }

    const candidates = await getSmartPlaceCandidates({ query, lat, lng, limit: Math.max(limit * 2, 10) })
    let places = candidates

    try {
      places = await rankPlacesWithOpenRouter({
        query,
        center: { lat, lng },
        places: candidates,
        limit,
      })
    } catch (err) {
      console.warn("OpenRouter place ranking failed, using Google Places order:", err.message)
      places = candidates.slice(0, limit)
    }

    return Response.json({
      provider: process.env.OPENROUTER_API_KEY ? "google-places+openrouter" : "google-places",
      places,
    })
  } catch (err) {
    console.error("GET /api/places/suggest error:", err)
    return Response.json({ error: "Failed to suggest places" }, { status: 500 })
  }
}
