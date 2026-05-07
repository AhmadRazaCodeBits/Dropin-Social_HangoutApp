const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const FOOD_KEYWORDS = [
  "chai",
  "tea",
  "coffee",
  "cafe",
  "burger",
  "pizza",
  "restaurant",
  "fast food",
  "shawarma",
  "biryani",
  "dessert",
  "ice cream",
  "bakery",
  "juice",
  "breakfast",
  "bbq",
]

function mapGooglePlace(p) {
  return {
    placeId: p.place_id,
    name: p.name,
    address: p.formatted_address || p.vicinity,
    rating: p.rating,
    userRatingsTotal: p.user_ratings_total,
    priceLevel: p.price_level,
    vicinity: p.vicinity,
    location: {
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    },
    types: p.types || [],
    photos: p.photos,
    openNow: p.opening_hours?.open_now,
  }
}

function validPlace(place) {
  return (
    place?.placeId &&
    place.name &&
    Number.isFinite(place.location?.lat) &&
    Number.isFinite(place.location?.lng)
  )
}

function dedupePlaces(places) {
  const seen = new Set()
  return places.filter((place) => {
    const key = place.placeId || `${place.name}-${place.location?.lat}-${place.location?.lng}`
    if (seen.has(key)) return false
    seen.add(key)
    return validPlace(place)
  })
}

/**
 * Google Maps API Implementation
 */

export async function getNearbyPlaces(lat, lng, type = "establishment", radius = 1500) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Missing Google Maps API Key")
    return []
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === "OK" && data.results) {
      return data.results.map(mapGooglePlace).filter(validPlace)
    } else if (data.status === "ZERO_RESULTS") {
      return []
    } else {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`)
    }
  } catch (err) {
    console.error("Google Places API failed:", err)
    return []
  }
}

export async function searchPlaces(query, lat, lng, radius = 5000) {
  if (!GOOGLE_MAPS_API_KEY) return []

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radius}&key=${GOOGLE_MAPS_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === "OK" && data.results) {
      return data.results.map(mapGooglePlace).filter(validPlace)
    }
    return []
  } catch (err) {
    console.error("Google Text Search failed:", err)
    return []
  }
}

export async function getSmartPlaceCandidates({ query = "", lat, lng, radius = 3000, limit = 12 }) {
  if (!GOOGLE_MAPS_API_KEY || !Number.isFinite(lat) || !Number.isFinite(lng)) return []

  const normalizedQuery = String(query || "").trim()
  const searches = normalizedQuery
    ? [normalizedQuery]
    : FOOD_KEYWORDS.slice(0, 8)

  const results = []
  for (const term of searches.slice(0, 4)) {
    const places = await searchPlaces(`${term} near me`, lat, lng, radius)
    results.push(...places)
    if (results.length >= limit * 2) break
  }

  if (!normalizedQuery && results.length < limit) {
    const nearby = await getNearbyPlaces(lat, lng, "restaurant", radius)
    results.push(...nearby)
  }

  return dedupePlaces(results).slice(0, limit)
}

export function getGoogleStaticMapUrl(lat, lng, zoom = 15, width = 400, height = 200) {
  if (!GOOGLE_MAPS_API_KEY || !Number.isFinite(lat) || !Number.isFinite(lng)) return ""

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
    markers: `color:red|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
  })

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

export async function geocodeAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) return null

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === "OK" && data.results?.[0]) {
      const loc = data.results[0].geometry.location
      return {
        lat: loc.lat,
        lng: loc.lng,
        address: data.results[0].formatted_address,
      }
    }
    return null
  } catch (err) {
    console.error("Google Geocoding failed:", err)
    return null
  }
}

export async function getWalkingEta(originLat, originLng, destLat, destLng) {
  if (!GOOGLE_MAPS_API_KEY) return 10 // Fallback

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === "OK" && data.rows?.[0]?.elements?.[0]?.status === "OK") {
      const durationSeconds = data.rows[0].elements[0].duration.value
      return Math.ceil(durationSeconds / 60)
    }
    
    // Fallback: simple distance calculation
    const dist = Math.sqrt(Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)) * 111
    return Math.ceil(dist / 0.08)
  } catch (err) {
    console.error("Google Distance Matrix failed:", err)
    return 10
  }
}
