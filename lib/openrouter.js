const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
const OPENROUTER_APP_URL = process.env.OPENROUTER_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || "DropIn"

function stripJsonFences(text) {
  return String(text || "").replace(/```json|```/g, "").trim()
}

export async function generateOpenRouterText(prompt, options = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable")
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_APP_URL,
      "X-Title": OPENROUTER_APP_NAME,
    },
    body: JSON.stringify({
      model: options.model || OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content:
            options.system ||
            "You are DropIn's local meetup assistant. Return practical, location-aware recommendations using only the data provided.",
        },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 900,
      response_format: options.json ? { type: "json_object" } : undefined,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 160)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenRouter returned an empty response")
  return content.trim()
}

export async function generateOpenRouterJSON(prompt, options = {}) {
  const raw = await generateOpenRouterText(prompt, { ...options, json: true })
  return JSON.parse(stripJsonFences(raw))
}

export function getOpenRouterModelName() {
  return OPENROUTER_MODEL
}

export async function rankPlacesWithOpenRouter({ query, vibe, center, places, limit = 6 }) {
  if (!OPENROUTER_API_KEY || !Array.isArray(places) || places.length === 0) {
    return places.slice(0, limit)
  }

  const prompt = `
The user is near coordinates (${center.lat}, ${center.lng}) and searched for "${query || vibe || "places nearby"}".

Verified Google Places candidates:
${places
  .map(
    (p, i) => `${i + 1}. ${p.name}
   - placeId: ${p.placeId}
   - address: ${p.address || p.vicinity || "Unknown"}
   - rating: ${p.rating ?? "N/A"} (${p.userRatingsTotal ?? 0} reviews)
   - openNow: ${p.openNow === undefined ? "unknown" : p.openNow ? "yes" : "no"}
   - types: ${p.types?.join(", ") || "N/A"}
   - lat/lng: ${p.location?.lat}, ${p.location?.lng}`
  )
  .join("\n")}

Rank the best ${limit} options for an accurate nearby meetup suggestion. Prefer exact query matches, open venues, strong ratings, and short walking distance. Use only candidates from the list.

Return ONLY this JSON object:
{
  "places": [
    {
      "placeId": "same placeId from the list",
      "name": "exact name",
      "address": "exact address",
      "reason": "short useful reason",
      "walkMinutes": 8
    }
  ]
}
`

  const ranked = await generateOpenRouterJSON(prompt, { maxTokens: 900 })
  const rankedPlaces = Array.isArray(ranked?.places) ? ranked.places : []
  const byId = new Map(places.map((place) => [place.placeId, place]))

  return rankedPlaces
    .map((rankedPlace) => {
      const original = byId.get(rankedPlace.placeId) || places.find((p) => p.name === rankedPlace.name)
      if (!original) return null
      return {
        ...original,
        reason: rankedPlace.reason || original.reason,
        walkMinutes: Number(rankedPlace.walkMinutes) || original.walkMinutes,
      }
    })
    .filter(Boolean)
    .slice(0, limit)
}
