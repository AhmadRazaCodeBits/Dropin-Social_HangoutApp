import { connectDB } from "@/lib/mongodb"
import ChatRoom from "@/models/ChatRoom"
import Signal from "@/models/Signal"
import Message from "@/models/Message"
import { pusherServer } from "@/lib/pusher"
import { getNearbyPlaces } from "@/lib/maps"
import { generateOpenRouterJSON } from "@/lib/openrouter"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  try {
    await connectDB()
    const { roomId, vibe, lat, lng } = await req.json()

    if (!roomId || !vibe) {
      return badRequest("roomId and vibe are required")
    }

    const room = await ChatRoom.findById(roomId).populate("members")
    if (!room) return Response.json({ error: "Chat room not found" }, { status: 404 })

    // --- Location Resolution ---
    const memberSignals = await Promise.all(room.members.map(async (member) => {
      let s = await Signal.findOne({ userId: member._id, status: "active" }).sort({ createdAt: -1 })
      if (!s) s = await Signal.findOne({ userId: member._id }).sort({ createdAt: -1 })
      return s
    }))

    const validSignals = memberSignals.filter(s => s && s.location?.coordinates)

    let cLat, cLng
    if (validSignals.length > 0) {
      const lats = validSignals.map(s => s.location.coordinates[1])
      const lngs = validSignals.map(s => s.location.coordinates[0])
      cLat = lats.reduce((a, b) => a + b, 0) / lats.length
      cLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
    } else if (lat && lng) {
      cLat = lat
      cLng = lng
    } else {
      return Response.json({ error: "No location data. Please drop a signal first." }, { status: 404 })
    }

    console.log(`📍 AI Suggestion Centroid: ${cLat}, ${cLng} (based on ${validSignals.length} signals)`)

    // --- Real Venue Discovery via Google Places ---
    let venues = []
    try {
      const typeMap = {
        chill: "cafe",
        coffee: "cafe",
        chai: "cafe",
        tea: "cafe",
        food: "restaurant",
        burger: "restaurant",
        pizza: "restaurant",
        dessert: "bakery",
        walk: "park",
        drinks: "bar",
        anything: "establishment"
      }
      
      const realPlaces = await getNearbyPlaces(cLat, cLng, typeMap[vibe] || "establishment", 2000)
      
      if (!realPlaces || realPlaces.length === 0) {
        throw new Error("No real places found nearby")
      }

      const prompt = `You are a local venue recommendation AI for a social meetup app.
Two friends want to meet near coordinates (${cLat}, ${cLng}). 
Their vibe is "${vibe}".

Here are the REAL, verified venues found nearby using Google Places:
${realPlaces.map((p, i) => `${i + 1}. ${p.name} - ${p.address} (Rating: ${p.rating ?? "N/A"}, Open: ${p.openNow === undefined ? "unknown" : p.openNow ? "yes" : "no"}, Types: ${p.types?.join(", ") || "N/A"})`).join("\n")}

Task:
Pick the top 3 venues from the list above that BEST fit the vibe "${vibe}".
Return ONLY a JSON object with a "venues" key containing an array of exactly 3 objects:
{
  "venues": [
    {
      "name": "string (exact name from the list)",
      "address": "string (exact address from the list)",
      "reason": "string (one short sentence why this is perfect)",
      "lat": number (exact latitude from the list),
      "lng": number (exact longitude from the list),
      "walkMinutes": number (estimated walking time, 1-20)
    }
  ]
}

IMPORTANT: Pick ONLY from the provided list. Return ONLY the JSON object.`

      const rawAiResponse = await generateOpenRouterJSON(prompt)
      
      // Robustly extract the array of venues
      let venuePicks = []
      if (Array.isArray(rawAiResponse)) {
        venuePicks = rawAiResponse
      } else if (Array.isArray(rawAiResponse?.venues)) {
        venuePicks = rawAiResponse.venues
      } else if (Array.isArray(rawAiResponse?.picks)) {
        venuePicks = rawAiResponse.picks
      } else {
        throw new Error("AI response did not contain a valid venues array")
      }

      // Sanitize and ensure coordinates from realPlaces are used
      venues = venuePicks.slice(0, 3).map(v => {
        const original = realPlaces.find(p => p.name === v.name)
        return {
          name: v.name || original?.name || "Local Spot",
          address: v.address || original?.address || "Nearby",
          reason: v.reason || "Great meetup spot",
          lat: original?.location?.lat || Number(v.lat) || cLat,
          lng: original?.location?.lng || Number(v.lng) || cLng,
          walkMinutes: Math.min(Number(v.walkMinutes) || 8, 30)
        }
      })

    } catch (aiErr) {
      console.error("AI venue selection failed, falling back to raw list:", aiErr.message)
      // Fallback: just take the first 3 real places if AI fails
      const rawPlaces = await getNearbyPlaces(cLat, cLng, "establishment", 2000)
      venues = rawPlaces.slice(0, 3).map(p => ({
        name: p.name,
        address: p.address,
        reason: "Highly rated local spot",
        lat: p.location.lat,
        lng: p.location.lng,
        walkMinutes: 10
      }))
    }

    // --- Save to DB (coordinates only — NO API keys in the database!) ---
    const msg = await Message.create({
      roomId,
      senderId: null,
      msgType: "venue_vote",
      content: "🤖 AI picked 3 spots — vote for your favourite!",
      metadata: { venues, votes: {} },
    })

    // --- Broadcast via Pusher ---
    if (pusherServer) {
      await pusherServer.trigger(`chat-${roomId}`, "message:new", {
        _id: msg._id.toString(),
        roomId,
        senderId: null,
        content: msg.content,
        msgType: "venue_vote",
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })
    }

    return Response.json({ success: true, venues })
  } catch (error) {
    console.error("CRITICAL Venue vote error:", error)
    return Response.json({ error: "System busy. Try again in a moment." }, { status: 500 })
  }
}
