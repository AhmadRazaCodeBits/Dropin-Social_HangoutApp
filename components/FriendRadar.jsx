"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { GoogleMap, useJsApiLoader, Polyline, Circle, Autocomplete, InfoWindow } from "@react-google-maps/api"
import { getPusherClient } from "@/lib/pusher"
import { VibePill, getVibeConfig } from "@/components/VibeIcon"
import { useRouter } from "next/navigation"
import { AdvancedMapMarker } from "@/components/AdvancedMapMarker"

const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"
const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e1e2e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e1e2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#7c7c9c" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#cba6f7" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#89b4fa" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#313244" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#a6e3a1" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#313244" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#45475a" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9399b2" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#45475a" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#585b70" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f9e2af" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#313244" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#cba6f7" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#11111b" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#45475a" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#11111b" }] }
]

function fuzzLocation(lat, lng) {
  const r = 0.004
  return {
    lat: lat + (Math.random() - 0.5) * r,
    lng: lng + (Math.random() - 0.5) * r,
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km) {
  if (km < 0.1) return `${Math.round(km * 1000)}m`
  if (km < 1) return `${(km * 1000).toFixed(0)}m`
  return `${km.toFixed(1)}km`
}

function walkingMinutes(km) {
  return Math.max(1, Math.ceil(km / 0.08))
}

const libraries = ["places", "marker"]

const QUICK_SEARCHES = [
  { label: "Chai", term: "chai" },
  { label: "Coffee", term: "coffee shop" },
  { label: "Burger", term: "burger" },
  { label: "Pizza", term: "pizza" },
  { label: "Food", term: "restaurant" },
  { label: "Dessert", term: "dessert" },
  { label: "Ice cream", term: "ice cream" },
  { label: "Bakery", term: "bakery" },
  { label: "Juice", term: "juice" },
  { label: "Drinks", term: "bar" },
  { label: "Parks", term: "park" },
]

export function FriendRadar({ userLocation, userId }) {
  const [signals, setSignals] = useState([])
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [pinnedPlaces, setPinnedPlaces] = useState([])
  const [sheetOpen, setSheetOpen] = useState(true)
  const [searchResult, setSearchResult] = useState(null)
  const router = useRouter()
  const mapRef = useRef(null)
  const autocompleteRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    mapIds: [googleMapsMapId],
    libraries
  })

  const handleDropIn = async (signal) => {
    if (!userId) { router.push("/login"); return }
    try {
      const res = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          signalId: signal.signalId || signal._id, 
          initiatorId: userId, 
          targetId: signal.authorId || signal.userId 
        }),
      })
      const data = await res.json()
      if (res.ok && data.roomId) router.push(`/chat/${data.roomId}`)
    } catch (err) { console.error("Failed to drop in:", err) }
  }

  useEffect(() => {
    let alive = true
    fetch(`/api/signals?userId=${userId}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        if (!alive) return
        const real = (d.signals || []).filter(s => String(s.authorId || s.userId) !== String(userId))
        setSignals(real)
      })
      .catch(() => { if (alive) setSignals([]) })
    return () => { alive = false }
  }, [userId, userLocation.lat, userLocation.lng])

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return
    const channels = [
      pusher.subscribe(`signals-${userId}`),
      pusher.subscribe("signals-public")
    ]
    channels.forEach(channel => {
      channel.bind("signal:new", (payload) => {
        if (channel.name === "signals-public" && payload.userId === userId) return
        setSignals(prev => [{
          signalId: payload.signalId, vibe: payload.vibe,
          lat: payload.lat, lng: payload.lng,
          userDisplayName: payload.isGhost ? "Ghost friend" : payload.displayName || "Friend",
          expiresAt: payload.expiresAt, userId: payload.userId,
        }, ...prev])
      })
      channel.bind("signal:expire", (payload) => {
        setSignals(prev => prev.filter(s => s.signalId !== payload.signalId))
      })
    })
    return () => {
      channels.forEach(channel => { channel.unbind_all(); pusher.unsubscribe(channel.name) })
    }
  }, [userId])

  const blobs = useMemo(() =>
    signals
      .filter(s => Number.isFinite(s?.lat) && Number.isFinite(s?.lng))
      .filter(s => s.authorId !== userId) // Hide self signal from radar
      .map(signal => {
        const fuzzed = fuzzLocation(signal.lat, signal.lng)
        // Use a distinct high-contrast color for friends so they stand out
        const color = signal.authorId === userId
            ? "#ef5f1f"
            : signal.isFriend
              ? "#22c55e" // bright green for friends (overrides vibe hex to improve visibility)
              : "#0ea5e9"
        const distKm = haversineKm(userLocation.lat, userLocation.lng, signal.lat, signal.lng)
        return { ...signal, fuzzed, color, distKm, distText: formatDist(distKm), walkMin: walkingMinutes(distKm) }
      })
      .sort((a, b) => a.distKm - b.distKm),
    [signals, userLocation.lat, userLocation.lng]
  )

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry) {
        const loc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }
        setSearchResult({
          name: place.name,
          address: place.formatted_address,
          location: loc,
          rating: place.rating
        })
        mapRef.current.panTo(loc)
        mapRef.current.setZoom(16)
      }
    }
  }

  const addPinnedPlace = (place) => {
    setPinnedPlaces(prev => [...prev, { ...place, id: Date.now() }])
    setSearchResult(null)
  }

  const quickSearch = (term) => {
    if (!mapRef.current) return
    const service = new google.maps.places.PlacesService(mapRef.current)
    service.nearbySearch({
      location: userLocation,
      radius: 1500,
      keyword: term
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        const topResults = results.slice(0, 5).map(r => ({
          name: r.name,
          address: r.vicinity,
          location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
          rating: r.rating
        }))
        // For simplicity, just pin the first one or show them
        setPinnedPlaces(prev => [...prev, ...topResults.filter(tr => !prev.some(p => p.name === tr.name)).slice(0, 2)])
      }
    })
  }

  if (loadError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#1e1e2e] p-6 text-center text-white">
        <div className="max-w-md space-y-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-base font-bold text-red-200">Google Maps failed to load</p>
          <p className="text-sm text-slate-200">
            Enable the Maps JavaScript API for this project in Google Cloud and make sure the API key is allowed to use it.
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#1e1e2e] text-white">Loading Map...</div>

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Header with Search */}
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-3 sm:left-5 sm:right-5 sm:top-5">
        <div className="flex items-center justify-between gap-3">
          <div className="glass-strong rounded-2xl px-4 py-3 flex-1 max-w-md flex items-center gap-2">
            <Autocomplete
              onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
              onPlaceChanged={onPlaceChanged}
              className="w-full"
            >
              <input
                type="text"
                placeholder="Search places or coffee..."
                className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              />
            </Autocomplete>
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="glass-strong hidden sm:flex items-center gap-2 rounded-2xl px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
              </span>
              <span className="text-xs font-semibold text-violet-300">Live</span>
            </div>
        </div>

        {/* Quick Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_SEARCHES.map((item) => (
            <button
              key={item.term}
              onClick={() => quickSearch(item.term)}
              className="glass-strong whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95 border border-white/10"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          mapId: googleMapsMapId,
          // Styles removed because mapId is present (style via Google Cloud Console)
          disableDefaultUI: true,
          zoomControl: false,
          clickableIcons: false
        }}
      >
        {/* You */}
        <AdvancedMapMarker 
          position={userLocation}
          color="#8E5BF8"
        />
        <Circle
          center={userLocation}
          radius={150}
          options={{
            fillColor: "#8E5BF8",
            fillOpacity: 0.1,
            strokeWeight: 0
          }}
        />

        {/* Friend Signals */}
        {blobs.map(signal => (
          <React.Fragment key={signal.signalId || `${signal.lat}-${signal.lng}`}>
            <AdvancedMapMarker
              position={signal.fuzzed}
              onClick={() => setSelectedSignal(signal)}
              color={signal.color}
            />
            {selectedSignal?.signalId === signal.signalId && (
              <>
                <Polyline
                  path={[userLocation, signal.fuzzed]}
                  options={{
                    strokeColor: signal.color,
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    icons: [{
                      icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
                      offset: "0",
                      repeat: "20px"
                    }]
                  }}
                />
                <Circle
                  center={signal.fuzzed}
                  radius={300}
                  options={{
                    fillColor: signal.color,
                    fillOpacity: 0.1,
                    strokeColor: signal.color,
                    strokeOpacity: 0.3,
                    strokeWeight: 1
                  }}
                />
              </>
            )}
          </React.Fragment>
        ))}

        {/* Pinned Places */}
        {pinnedPlaces.map(place => (
          <AdvancedMapMarker
            key={place.id || place.name}
            position={place.location}
            color="#2563eb"
            onClick={() => setSearchResult(place)}
          />
        ))}

        {/* Search Result Info Window */}
        {searchResult && (
          <InfoWindow
            position={searchResult.location}
            onCloseClick={() => setSearchResult(null)}
          >
            <div className="p-1 min-w-[150px]">
              <h4 className="font-bold text-slate-900">{searchResult.name}</h4>
              <p className="text-[10px] text-slate-600 line-clamp-1">{searchResult.address}</p>
              {searchResult.rating && <p className="text-[10px] text-amber-500 mt-1">⭐ {searchResult.rating}</p>}
              {!pinnedPlaces.some(p => p.name === searchResult.name) && (
                <button 
                  onClick={() => addPinnedPlace(searchResult)}
                  className="mt-2 w-full bg-indigo-600 text-white text-[10px] py-1 rounded font-bold"
                >
                  Add to Radar
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Bottom sheet */}
      <div className={`absolute inset-x-0 bottom-0 z-10 transition-transform duration-500 ease-spring ${sheetOpen ? "translate-y-0" : "translate-y-[calc(100%-3rem)]"}`}>
        <div className="glass-strong rounded-t-3xl border-t border-white/10 p-4 sm:p-5 shadow-2xl">
          <button type="button" onClick={() => setSheetOpen(v => !v)} className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/20 transition-all hover:bg-white/40" />

          {selectedSignal ? (
            <div className="animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Selected signal</p>
                  <h4 className="font-bold text-white">{selectedSignal.userDisplayName}</h4>
                  <div className="flex gap-2 items-center mt-1">
                    {selectedSignal.isFriend ? (
                      <span className="bg-lime-600/20 text-lime-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Friend</span>
                    ) : (
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Discover</span>
                    )}
                    <span className="text-slate-500 text-[10px]">•</span>
                    <span className="text-slate-400 text-[10px] uppercase tracking-widest">{selectedSignal.distText} away</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <VibePill vibe={selectedSignal.vibe} />
                    <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/20">
                      🚶 {selectedSignal.walkMin} min
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDropIn(selectedSignal)} className="btn-white !px-4 !py-2 !text-xs shadow-glow-white">Drop In</button>
                  <button onClick={() => setSelectedSignal(null)} className="glass-strong !p-2 rounded-xl text-white">✕</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-white">Nearby Now</h3>
                <div className="flex gap-2">
                   <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-white/10">
                    {signals.length} Friends
                  </span>
                  <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                    {pinnedPlaces.length} Places
                  </span>
                </div>
              </div>
              <ul className="max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {blobs.map(signal => (
                  <li
                    key={`sheet-${signal.signalId || `${signal.lat}-${signal.lng}`}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => setSelectedSignal(signal)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300/80 to-rose-500/70 shadow-lg shadow-amber-500/20" />
                      <div>
                        <span className="text-sm font-semibold text-slate-100">{signal.userDisplayName || "Friend"}</span>
                        <p className="text-[10px] text-slate-500">🚶 {signal.walkMin} min walk</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{signal.distText}</span>
                      <VibePill vibe={signal.vibe || "anything"} />
                    </div>
                  </li>
                ))}
                
                {pinnedPlaces.map(place => (
                  <li
                    key={`place-${place.id || place.name}`}
                    className="flex items-center justify-between rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] px-3 py-2.5 transition-all duration-200 hover:bg-indigo-500/[0.06] cursor-pointer"
                    onClick={() => {
                      setSearchResult(place)
                      mapRef.current.panTo(place.location)
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                        📍
                      </div>
                      <div className="max-w-[120px]">
                        <span className="text-sm font-semibold text-slate-100 truncate block">{place.name}</span>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{place.address}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPinnedPlaces(prev => prev.filter(p => p.name !== place.name)) }}
                      className="text-xs text-slate-500 hover:text-rose-400 p-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}

                {signals.length === 0 && pinnedPlaces.length === 0 && (
                  <li className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                      <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Nothing nearby</p>
                    <p className="text-[10px] text-slate-600 mt-1">Search for places to add them</p>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
