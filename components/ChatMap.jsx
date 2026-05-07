"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Circle, GoogleMap, InfoWindow, Polyline, useJsApiLoader } from "@react-google-maps/api"
import { AdvancedMapMarker } from "@/components/AdvancedMapMarker"

const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"
const libraries = ["places", "marker"]

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1e1e2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e1e2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a6adc8" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#89b4fa" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#233326" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#313244" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#45475a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#45475a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#313244" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#11111b" }] },
]

const QUICK_TERMS = [
  "chai",
  "coffee",
  "burger",
  "pizza",
  "restaurant",
  "fast food",
  "dessert",
  "ice cream",
  "bakery",
  "juice",
  "park",
  "tea",
]

function markerIcon(color, scale = 8) {
  if (typeof google === "undefined") return undefined
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3,
    scale,
  }
}

function pinIcon() {
  if (typeof google === "undefined") return undefined
  return {
    path: "M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z",
    fillColor: "#ef5f1f",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1.5,
    anchor: new google.maps.Point(12, 22),
  }
}

function distanceKm(a, b) {
  if (!a || !b) return null
  const r = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function ChatMap({ myLocation, otherLocation, me, otherUser, onClose, onShareLocation }) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [mapTypeId, setMapTypeId] = useState("roadmap")
  const mapRef = useRef(null)
  const searchAbortRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    mapIds: [googleMapsMapId],
    libraries,
  })

  const defaultCenter = useMemo(() => ({ lat: 31.5204, lng: 74.3587 }), [])
  const center = myLocation || otherLocation || defaultCenter
  const path = myLocation && otherLocation ? [myLocation, otherLocation] : []

  const recenter = useCallback(() => {
    if (!mapRef.current) return
    const points = [myLocation, otherLocation, selectedLocation].filter(Boolean)
    if (points.length === 0) {
      mapRef.current.setCenter(defaultCenter)
      mapRef.current.setZoom(13)
      return
    }

    if (points.length === 1) {
      mapRef.current.panTo(points[0])
      mapRef.current.setZoom(16)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    points.forEach((point) => bounds.extend(point))
    mapRef.current.fitBounds(bounds, 80)
  }, [defaultCenter, myLocation, otherLocation, selectedLocation])

  useEffect(() => {
    if (isLoaded) recenter()
  }, [isLoaded, recenter])

  const runSearch = useCallback(async (term = query) => {
    const trimmed = term.trim()
    const origin = myLocation || center
    if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return

    if (searchAbortRef.current) searchAbortRef.current.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setSearching(true)

    try {
      const params = new URLSearchParams({
        lat: String(origin.lat),
        lng: String(origin.lng),
        query: trimmed,
        limit: "8",
      })
      const res = await fetch(`/api/places/suggest?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      const data = await res.json()
      if (res.ok) {
        const sorted = (data.places || []).sort((a, b) => {
          const distA = distanceKm(origin, a.location)
          const distB = distanceKm(origin, b.location)
          return (distA ?? Infinity) - (distB ?? Infinity)
        })
        setSuggestions(sorted)
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Place search failed:", err)
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }, [center, myLocation, query])

  useEffect(() => {
    if (query.trim().length < 2) return
    const timeout = setTimeout(() => runSearch(query), 350)
    return () => clearTimeout(timeout)
  }, [query, runSearch])

  function selectPlace(place) {
    const loc = { lat: place.location.lat, lng: place.location.lng }
    setSelectedPlace(place)
    setSelectedLocation(loc)
    mapRef.current?.panTo(loc)
    mapRef.current?.setZoom(17)
  }

  function selectMapPoint(event) {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() }
    setSelectedLocation(loc)
    setSelectedPlace(null)
  }

  const selectedDistance = distanceKm(myLocation, selectedLocation)

  if (loadError) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-night-900 p-6 text-center text-sm text-white">
        <div className="max-w-md space-y-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-base font-bold text-red-200">Google Maps failed to load</p>
          <p className="text-slate-200">
            Enable the Maps JavaScript API for this project in Google Cloud and confirm the API key is allowed to use it.
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-night-900 text-sm font-bold text-white">
        Loading Google Maps...
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-night-900 animate-fade-in">
      <header className="glass-card !rounded-none !border-x-0 !border-t-0 p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="font-bold text-white">Pick a Place</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">
            Search nearby or tap the map
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/10 rounded-full">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          onLoad={(map) => (mapRef.current = map)}
          onClick={selectMapPoint}
          mapTypeId={mapTypeId}
          options={{
            mapId: googleMapsMapId,
            // Styles removed because mapId is present (style via Google Cloud Console)
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: true,
            clickableIcons: true,
            gestureHandling: "greedy",
          }}
        >
          {myLocation && (
            <>
              <AdvancedMapMarker position={myLocation} color="#1D9E75" title={me?.displayName || "You"} />
              <Circle
                center={myLocation}
                radius={250}
                options={{ fillColor: "#1D9E75", fillOpacity: 0.12, strokeColor: "#1D9E75", strokeOpacity: 0.35, strokeWeight: 1 }}
              />
            </>
          )}

          {otherLocation && (
            <>
              <AdvancedMapMarker position={otherLocation} color="#8E5BF8" title={otherUser?.displayName || "Friend"} />
              <Circle
                center={otherLocation}
                radius={350}
                options={{ fillColor: "#8E5BF8", fillOpacity: 0.1, strokeColor: "#8E5BF8", strokeOpacity: 0.3, strokeWeight: 1 }}
              />
            </>
          )}

          {path.length === 2 && (
            <Polyline path={path} options={{ strokeColor: "#ffffff", strokeOpacity: 0.55, strokeWeight: 2 }} />
          )}

          {suggestions.map((place) => (
            <AdvancedMapMarker
              key={place.placeId}
              position={place.location}
              color="#3b82f6"
              title={`${place.name} (${(distanceKm(myLocation, place.location) * 1000).toFixed(0)}m)`}
              onClick={() => selectPlace(place)}
            />
          ))}

          {selectedLocation && (
            <AdvancedMapMarker
              position={selectedLocation}
              color="#ef5f1f"
              kind="pin"
              title={selectedPlace?.name || "Selected spot"}
            />
          )}

          {selectedLocation && (
            <InfoWindow position={selectedLocation} onCloseClick={() => setSelectedLocation(null)}>
              <div className="max-w-[220px] p-1 text-slate-900">
                <p className="text-sm font-bold">{selectedPlace?.name || "Custom location"}</p>
                {selectedPlace?.address && <p className="mt-1 text-[11px] text-slate-600">{selectedPlace.address}</p>}
                {selectedPlace?.reason && <p className="mt-1 text-[11px] text-indigo-700">{selectedPlace.reason}</p>}
                {selectedDistance !== null && (
                  <p className="mt-1 text-[11px] font-semibold text-slate-700">
                    About {Math.max(1, Math.ceil(selectedDistance / 0.08))} min walk
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        <div className="absolute left-3 right-3 top-3 z-[1000] space-y-2 sm:left-4 sm:right-auto sm:w-[420px]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              runSearch(query)
            }}
            className="glass-strong rounded-2xl p-2 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chai, coffee, burger, pizza..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              />
              <button type="submit" className="btn-primary !px-3 !py-2 !text-xs" disabled={searching}>
                {searching ? "..." : "Search"}
              </button>
            </div>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_TERMS.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term)
                  runSearch(term)
                }}
                className="glass-strong whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold capitalize text-white transition-all hover:bg-white/20 active:scale-95"
              >
                {term}
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-night-900/90 p-2 shadow-2xl backdrop-blur-xl">
              {suggestions.map((place) => (
                <button
                  key={`row-${place.placeId}`}
                  type="button"
                  onClick={() => selectPlace(place)}
                  className="block w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{place.name}</p>
                      <p className="line-clamp-1 text-[11px] text-slate-400">{place.address || place.vicinity}</p>
                      {place.reason && <p className="line-clamp-1 text-[11px] text-indigo-300">{place.reason}</p>}
                    </div>
                    {myLocation && place.location && (
                      <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-200">
                        {(distanceKm(myLocation, place.location) * 1000).toFixed(0)}m
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-24 right-3 z-[1000] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-night-900/85 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-xl">
          {["roadmap", "satellite", "hybrid", "terrain"].map((type) => (
            <button
              key={type}
              onClick={() => setMapTypeId(type)}
              className={`px-3 py-2 capitalize transition-colors ${mapTypeId === type ? "bg-ember-500 text-white" : "hover:bg-white/10"}`}
            >
              {type}
            </button>
          ))}
        </div>

        {(!myLocation || !otherLocation) && !selectedLocation && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
            <div className="bg-night-800/90 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-xs text-white shadow-xl">
              {!myLocation ? "Getting your location..." : `Waiting for ${otherUser?.displayName || "friend"}'s location...`}
            </div>
          </div>
        )}

        {selectedLocation && (
          <div className="absolute bottom-6 left-4 right-4 z-[1000] animate-fade-in-up">
            <button
              onClick={() => {
                if (onShareLocation) onShareLocation(selectedLocation.lat, selectedLocation.lng, selectedPlace)
              }}
              className="w-full btn-primary !py-4 shadow-xl"
            >
              Share {selectedPlace?.name || "this spot"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
