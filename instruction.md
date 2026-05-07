# DropIn — Full Vibe-Coding Prompt
## 🎯 Project Overview

Build **DropIn** — a spontaneous social hangout web app where users broadcast real-time "I'm free right now" signals to nearby friends, and an AI engine suggests the perfect meeting spot in seconds. No scheduling. No group chats. Just right now.

**Tagline:** "Hang out in 30 seconds."

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) — **JavaScript only, no TypeScript** |
| Database | MongoDB Atlas + Mongoose ODM |
| Auth | NextAuth.js (credentials + OAuth) |
| Styling | Tailwind CSS |
| AI | **Google Gemini API** (`gemini-1.5-flash`) |
| Maps & Places | **RapidAPI** (default for all external APIs) + Google Maps JS API (frontend render only) |
| Real-time | Pusher (channels) |
| Notifications | Web Push API + Pusher |
| Payments (later) | Stripe |
| Deployment | Vercel |

> **RapidAPI note:** All third-party API calls (Places search, Distance Matrix, Geocoding) default to RapidAPI-hosted endpoints. Sign up at https://rapidapi.com and subscribe to:
> - **Google Maps Places API** (by RapidAPI)
> - **Google Maps Distance Matrix API** (by RapidAPI)
> - **Geocoding by API-Ninjas**
>
> Swap in any direct key later — the route structure stays identical.

> **Gemini note:** Get your free API key at https://aistudio.google.com/app/apikey. Install with `npm install @google/generative-ai`.

---

## 📁 Project Structure

```
dropin/
├── app/
│   ├── (auth)/
│   │   ├── login/page.jsx
│   │   └── signup/page.jsx
│   ├── (app)/
│   │   ├── home/page.jsx
│   │   ├── radar/page.jsx
│   │   ├── hangout/[id]/page.jsx
│   │   ├── journal/page.jsx
│   │   ├── discover/page.jsx
│   │   ├── chat/[roomId]/page.jsx
│   │   └── profile/page.jsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js
│   │   ├── signals/route.js
│   │   ├── ai-spot/route.js          ← Gemini picks venues
│   │   ├── ai-memory/route.js        ← Gemini writes memory card
│   │   ├── compatibility/route.js
│   │   ├── discover/route.js
│   │   ├── chat/
│   │   │   ├── create/route.js
│   │   │   └── venue-vote/route.js
│   │   └── eta/
│   │       ├── start/route.js
│   │       ├── ping/route.js
│   │       └── arrived/route.js
│   └── layout.jsx
├── components/
│   ├── SignalBroadcaster.jsx
│   ├── FriendRadar.jsx
│   ├── SpotCard.jsx
│   ├── HangoutCard.jsx
│   ├── VibeSelector.jsx
│   ├── TimerBadge.jsx
│   ├── FriendAvatar.jsx
│   ├── EtaTracker.jsx
│   ├── ChatRoom.jsx
│   └── LocationGate.jsx
├── lib/
│   ├── mongodb.js       ← Mongoose connection
│   ├── gemini.js        ← Gemini AI helper
│   ├── rapidapi.js      ← All external API calls
│   ├── pusher.js        ← Pusher server + client
│   └── geo.js           ← Haversine + fuzz helpers
└── models/
    ├── User.js
    ├── Friendship.js
    ├── Signal.js
    ├── DropIn.js
    ├── Hangout.js
    ├── HangoutMember.js
    ├── Rating.js
    ├── PublicProfile.js
    ├── ChatRoom.js
    ├── ChatMember.js
    ├── Message.js
    ├── Block.js
    ├── EtaTracking.js
    └── LocationPing.js
```

---

## 🔑 Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dropin

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Gemini AI  (replaces Claude)
GEMINI_API_KEY=your_gemini_api_key

# RapidAPI  (all external APIs)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_PLACES_HOST=google-maps-geocoding3.p.rapidapi.com
RAPIDAPI_DISTANCE_HOST=google-maps-distance-matrix2.p.rapidapi.com
RAPIDAPI_GEOCODE_HOST=geocoding-by-api-ninjas.p.rapidapi.com

# Google Maps  (frontend map render only — free JS API)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_js_key

# Pusher  (real-time)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=eu
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

---

## 🔌 Core Library Files

### `lib/gemini.js` — Gemini AI wrapper

```js
// lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Shared model instance — gemini-1.5-flash is fast and free-tier friendly
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

/**
 * Simple text generation helper
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateText(prompt) {
  const result = await geminiModel.generateContent(prompt)
  const response = result.response
  return response.text()
}

/**
 * JSON generation helper — strips markdown fences before parsing
 * @param {string} prompt
 * @returns {Promise<any>}
 */
export async function generateJSON(prompt) {
  const raw = await generateText(prompt)
  const clean = raw.replace(/```json|```/g, "").trim()
  return JSON.parse(clean)
}
```

---

### `lib/rapidapi.js` — All external API calls

```js
// lib/rapidapi.js
const KEY = process.env.RAPIDAPI_KEY

/**
 * Nearby places via RapidAPI Google Maps Places
 */
export async function nearbyPlaces(lat, lng, type) {
  const res = await fetch(
    `https://${process.env.RAPIDAPI_PLACES_HOST}/nearbysearch/json` +
    `?location=${lat},${lng}&radius=1500&type=${type}`,
    {
      headers: {
        "X-RapidAPI-Key":  KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_PLACES_HOST,
      },
    }
  )
  const data = await res.json()
  return data.results || []
}

/**
 * Walking/driving distance in minutes via RapidAPI Distance Matrix
 */
export async function distanceMatrix(originLat, originLng, destLat, destLng, mode = "walking") {
  const res = await fetch(
    `https://${process.env.RAPIDAPI_DISTANCE_HOST}/distancematrix/json` +
    `?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}`,
    {
      headers: {
        "X-RapidAPI-Key":  KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_DISTANCE_HOST,
      },
    }
  )
  const data = await res.json()
  const seconds = data.rows?.[0]?.elements?.[0]?.duration?.value ?? 0
  return Math.ceil(seconds / 60)
}

/**
 * Geocode an address to lat/lng via API-Ninjas on RapidAPI
 */
export async function geocodeAddress(address) {
  const res = await fetch(
    `https://${process.env.RAPIDAPI_GEOCODE_HOST}/v1/geocode?city=${encodeURIComponent(address)}`,
    {
      headers: {
        "X-RapidAPI-Key":  KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_GEOCODE_HOST,
      },
    }
  )
  const data = await res.json()
  return { lat: data[0]?.latitude, lng: data[0]?.longitude }
}
```

---

### `lib/mongodb.js`

```js
// lib/mongodb.js
import mongoose from "mongoose"

let cached = global.mongoose || { conn: null, promise: null }

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })
  }
  cached.conn = await cached.promise
  global.mongoose = cached
  return cached.conn
}
```

---

### `lib/pusher.js`

```js
// lib/pusher.js
import Pusher       from "pusher"
import PusherClient from "pusher-js"

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
})

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
})
```

---

### `lib/geo.js`

```js
// lib/geo.js
export function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Add ~400m random offset for privacy — never expose exact GPS to clients
export function fuzzLocation(lat, lng) {
  const r = 0.004
  return {
    lat: lat + (Math.random() - 0.5) * r,
    lng: lng + (Math.random() - 0.5) * r,
  }
}
```

---

## 🗄 MongoDB Schemas (Mongoose)

```js
// models/Signal.js
import mongoose from "mongoose"

const SignalSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vibe:          { type: String, required: true, enum: ["chill","coffee","food","walk","drinks","anything"] },
  windowMinutes: { type: Number, required: true, enum: [30, 60, 120] },
  radiusKm:      { type: Number, required: true, enum: [1, 3, 10] },
  isGhost:       { type: Boolean, default: false },
  isPublic:      { type: Boolean, default: false },
  publicBio:     String,
  location: {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  expiresAt: { type: Date, required: true },
  status:    { type: String, default: "active", enum: ["active","matched","expired"] },
}, { timestamps: true })

SignalSchema.index({ location: "2dsphere" }) // required for geo queries
export default mongoose.models.Signal || mongoose.model("Signal", SignalSchema)


// models/Hangout.js
const HangoutSchema = new mongoose.Schema({
  signalId:      { type: mongoose.Schema.Types.ObjectId, ref: "Signal" },
  chatRoomId:    { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
  venueName:     String,
  venueAddress:  String,
  venueLocation: {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number],
  },
  aiReason:  String,   // Gemini's one-liner for this venue pick
  aiMemory:  String,   // Gemini-generated memory card
  endedAt:   Date,
}, { timestamps: true })


// models/EtaTracking.js
const EtaTrackingSchema = new mongoose.Schema({
  hangoutId:   { type: mongoose.Schema.Types.ObjectId, ref: "Hangout" },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  currentLat:  Number,  // stored server-side ONLY, never sent to clients
  currentLng:  Number,  // stored server-side ONLY, never sent to clients
  etaMinutes:  Number,  // the ONLY value pushed to other clients
  travelMode:  { type: String, default: "walking" },
  arrived:     { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true })


// models/Message.js
const MessageSchema = new mongoose.Schema({
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content:  String,
  msgType:  { type: String, default: "text", enum: ["text","venue_vote","system"] },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true })


// models/PublicProfile.js
const PublicProfileSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  displayName:         String,
  isIdVerified:        { type: Boolean, default: false },
  communityRating:     { type: Number, default: 5.0 },
  totalPublicHangouts: { type: Number, default: 0 },
  genderIdentity:      String,
  ageRange:            { type: String, enum: ["18-25","25-35","35+"] },
  showToGenders:       [String],
  minPartnerAge:       Number,
  maxPartnerAge:       Number,
  verifiedOnly:        { type: Boolean, default: false },
}, { timestamps: true })


// models/Block.js
const BlockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true })


// models/Rating.js
const RatingSchema = new mongoose.Schema({
  hangoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Hangout" },
  raterId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ratedId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  score:     { type: Number, min: 1, max: 5 },
}, { timestamps: true })


// models/LocationPing.js
const LocationPingSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lat:          Number,
  lng:          Number,
  speedKmh:     Number,
  isSuspicious: { type: Boolean, default: false },
}, { timestamps: true })
```

---

## 📱 API Routes

---

### `POST /api/signals` — broadcast a signal

```js
// app/api/signals/route.js
import { connectDB }     from "@/lib/mongodb"
import Signal            from "@/models/Signal"
import { pusherServer }  from "@/lib/pusher"
import { NextResponse }  from "next/server"

export async function POST(req) {
  await connectDB()
  const body = await req.json()

  const signal = await Signal.create({
    userId:        body.userId,
    vibe:          body.vibe,
    windowMinutes: body.windowMinutes,
    radiusKm:      body.radiusKm,
    isGhost:       body.isGhost,
    isPublic:      body.isPublic,
    publicBio:     body.publicBio,
    location: {
      type:        "Point",
      coordinates: [body.lng, body.lat],
    },
    expiresAt: new Date(body.expiresAt),
  })

  // Push new signal to all connected clients
  await pusherServer.trigger("signals", "new-signal", {
    signalId: signal._id.toString(),
    vibe:     signal.vibe,
    lat:      body.lat,
    lng:      body.lng,
    expiresAt: signal.expiresAt,
  })

  return NextResponse.json({ signal })
}

export async function GET() {
  await connectDB()
  const signals = await Signal.find({
    status:    "active",
    expiresAt: { $gt: new Date() },
  }).populate("userId", "username displayName avatarUrl")
  return NextResponse.json({ signals })
}
```

---

### `POST /api/ai-spot` — Gemini picks top venues

```js
// app/api/ai-spot/route.js
import { generateJSON }  from "@/lib/gemini"
import { nearbyPlaces }  from "@/lib/rapidapi"
import { haversine }     from "@/lib/geo"
import { NextResponse }  from "next/server"

function vibeToPlaceType(vibe) {
  return {
    coffee:   "cafe",
    food:     "restaurant",
    drinks:   "bar",
    chill:    "cafe",
    walk:     "park",
    anything: "establishment",
  }[vibe] || "establishment"
}

export async function POST(req) {
  const { members, vibe, windowMinutes } = await req.json()

  // 1. Calculate centroid of all member locations
  const centroidLat = members.reduce((s, m) => s + m.lat, 0) / members.length
  const centroidLng = members.reduce((s, m) => s + m.lng, 0) / members.length

  // 2. Fetch nearby places via RapidAPI
  const places = (await nearbyPlaces(centroidLat, centroidLng, vibeToPlaceType(vibe))).slice(0, 8)
  const maxDist = Math.max(...members.map(m => haversine(m.lat, m.lng, centroidLat, centroidLng)))

  // 3. Ask Gemini to rank and explain
  const prompt = `
You are DropIn's AI hangout coordinator. A group of ${members.length} friends want to meet up.

Vibe: ${vibe}
Time window: ${windowMinutes} minutes
Group size: ${members.length} people
Max member distance from meeting point: ${maxDist.toFixed(1)} km

Available nearby venues:
${places.map((p, i) => `${i + 1}. ${p.name} — Rating: ${p.rating ?? "N/A"}/5, Address: ${p.vicinity}`).join("\n")}

Pick the top 3 venues. For each one write:
- name (exact from the list)
- address (exact from the list)
- reason: one sentence explaining why it's perfect for this group RIGHT NOW — mention the vibe, how central it is, and something specific about the venue
- walkMinutes: estimated walking time (assume 5 km/h walking speed)

Respond ONLY in valid JSON like this, with no extra text or markdown:
{
  "picks": [
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 8 },
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 12 },
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 5 }
  ]
}
`

  const data = await generateJSON(prompt)
  return NextResponse.json(data)
}
```

---

### `POST /api/ai-memory` — Gemini writes a hangout memory card

```js
// app/api/ai-memory/route.js
import { generateText }  from "@/lib/gemini"
import { connectDB }     from "@/lib/mongodb"
import Hangout           from "@/models/Hangout"
import { NextResponse }  from "next/server"

export async function POST(req) {
  const { hangoutId, venue, members, vibe, durationMinutes } = await req.json()

  const prompt = `
Write a short, warm, poetic memory card for a spontaneous hangout.

Details:
- Where: ${venue.name}, ${venue.address}
- Who: ${members.map(m => m.displayName).join(", ")}
- Vibe: ${vibe}
- Duration: ${durationMinutes} minutes

Rules:
- Maximum 2 sentences
- Feel like a diary entry — specific, warm, slightly lyrical
- Do NOT use their names — say "you all" or "everyone"
- Do NOT start with "I"
- Do NOT be generic

Good tone examples:
- "A Tuesday afternoon that turned into two hours of coffee and absurd conversation at a corner table no one planned for."
- "Somehow a 30-minute walk became the best part of the week."

Respond with ONLY the memory text, nothing else.
`

  const memory = await generateText(prompt)

  // Persist memory to MongoDB
  await connectDB()
  await Hangout.findByIdAndUpdate(hangoutId, { aiMemory: memory.trim() })

  return NextResponse.json({ memory: memory.trim() })
}
```

---

### `POST /api/discover` — vibe-matched nearby strangers

```js
// app/api/discover/route.js
import { connectDB }    from "@/lib/mongodb"
import Signal           from "@/models/Signal"
import PublicProfile    from "@/models/PublicProfile"
import Block            from "@/models/Block"
import { haversine }    from "@/lib/geo"
import { NextResponse } from "next/server"

const VIBE_GRAPH = {
  drinks:  { drinks: 100, food: 70, chill: 60, coffee: 40, walk: 20 },
  coffee:  { coffee: 100, chill: 75, food: 65, drinks: 40, walk: 50 },
  food:    { food: 100, drinks: 70, coffee: 65, chill: 60, walk: 30 },
  chill:   { chill: 100, coffee: 75, drinks: 60, food: 60, walk: 65 },
  walk:    { walk: 100, chill: 65, coffee: 50, food: 30, drinks: 20 },
  anything:{ drinks: 85, coffee: 85, food: 85, chill: 85, walk: 85 },
}

function vibeMatchScore(myVibe, theirVibe) {
  return VIBE_GRAPH[myVibe]?.[theirVibe] ?? 30
}

export async function POST(req) {
  await connectDB()
  const { lat, lng, vibe, radiusKm, userId } = await req.json()

  const blocks = await Block.find({ $or: [{ blockerId: userId }, { blockedId: userId }] })
  const blockedIds = blocks.map(b => b.blockerId.toString() === userId ? b.blockedId : b.blockerId)

  // MongoDB 2dsphere geo query
  const signals = await Signal.find({
    isPublic:  true,
    status:    "active",
    expiresAt: { $gt: new Date() },
    userId:    { $ne: userId, $nin: blockedIds },
    location: {
      $nearSphere: {
        $geometry:    { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).populate("userId", "username")

  const results = await Promise.all(
    signals.map(async (s) => {
      const profile    = await PublicProfile.findOne({ userId: s.userId._id })
      const distanceKm = haversine(lat, lng, s.location.coordinates[1], s.location.coordinates[0])
      return {
        signalId:        s._id,
        userId:          s.userId._id,
        displayName:     profile?.displayName || s.userId.username,
        vibe:            s.vibe,
        publicBio:       s.publicBio,
        communityRating: profile?.communityRating,
        isIdVerified:    profile?.isIdVerified,
        distanceKm:      +distanceKm.toFixed(2),
        matchScore:      vibeMatchScore(vibe, s.vibe),
      }
    })
  )

  results.sort((a, b) => b.matchScore - a.matchScore)
  return NextResponse.json({ results })
}
```

---

### `POST /api/chat/create` — start a DM

```js
// app/api/chat/create/route.js
import { connectDB }    from "@/lib/mongodb"
import ChatRoom         from "@/models/ChatRoom"
import ChatMember       from "@/models/ChatMember"
import Message          from "@/models/Message"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req) {
  await connectDB()
  const { signalId, initiatorId, targetId } = await req.json()

  const room = await ChatRoom.create({ signalId, roomType: "dm" })

  await ChatMember.insertMany([
    { roomId: room._id, userId: initiatorId },
    { roomId: room._id, userId: targetId },
  ])

  await Message.create({
    roomId:  room._id,
    msgType: "system",
    content: "Chat started — say hi!",
  })

  // Notify the target user in real-time
  await pusherServer.trigger(`user-${targetId}`, "new-chat", {
    roomId:      room._id.toString(),
    initiatorId,
  })

  return NextResponse.json({ roomId: room._id })
}
```

---

### `POST /api/chat/venue-vote` — AI suggests venues inside chat

```js
// app/api/chat/venue-vote/route.js
import { generateJSON }  from "@/lib/gemini"
import { nearbyPlaces }  from "@/lib/rapidapi"
import { connectDB }     from "@/lib/mongodb"
import ChatMember        from "@/models/ChatMember"
import Signal            from "@/models/Signal"
import Message           from "@/models/Message"
import { pusherServer }  from "@/lib/pusher"
import { NextResponse }  from "next/server"

export async function POST(req) {
  await connectDB()
  const { roomId, vibe, windowMinutes } = await req.json()

  // Get member locations from their active signals
  const members = await ChatMember.find({ roomId }).populate({
    path:  "userId",
    model: "User",
  })

  const memberSignals = await Promise.all(
    members.map(m => Signal.findOne({ userId: m.userId, status: "active" }).sort({ createdAt: -1 }))
  )

  const locations = memberSignals
    .filter(Boolean)
    .map(s => ({ lat: s.location.coordinates[1], lng: s.location.coordinates[0] }))

  const centroidLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length
  const centroidLng = locations.reduce((s, l) => s + l.lng, 0) / locations.length

  const placeType = { coffee:"cafe", food:"restaurant", drinks:"bar", chill:"cafe", walk:"park", anything:"establishment" }[vibe] || "establishment"
  const places = (await nearbyPlaces(centroidLat, centroidLng, placeType)).slice(0, 6)

  const prompt = `
You are DropIn's hangout AI. A group of ${members.length} people in a chat want to meet up.

Vibe: ${vibe}
Time window: ${windowMinutes} minutes

Nearby venues:
${places.map((p, i) => `${i + 1}. ${p.name} — Rating: ${p.rating ?? "N/A"}/5, ${p.vicinity}`).join("\n")}

Pick the 3 best options. Respond ONLY in valid JSON with no extra text:
{
  "venues": [
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 7 },
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 10 },
    { "name": "...", "address": "...", "reason": "...", "walkMinutes": 4 }
  ]
}
`

  const { venues } = await generateJSON(prompt)

  // Post as a venue_vote message inside the chat
  const msg = await Message.create({
    roomId,
    msgType:  "venue_vote",
    content:  "AI picked 3 spots — tap your favourite to vote",
    metadata: { venues, votes: {} },
  })

  // Push to all chat members via Pusher
  await pusherServer.trigger(`chat-${roomId}`, "new-message", {
    _id:      msg._id,
    msgType:  "venue_vote",
    content:  msg.content,
    metadata: msg.metadata,
  })

  return NextResponse.json({ success: true, venues })
}
```

---

## 📍 ETA System — "Time Not Location"

**Core principle:** Raw GPS coordinates stay on the server and are never exposed to other clients. The only value shared between users is a travel time in minutes.

```
User A GPS → server → RapidAPI Distance Matrix → etaMinutes → pushed to all members
User B GPS → server → RapidAPI Distance Matrix → etaMinutes → pushed to all members

What User A sees:  You → 8 min  |  Ali → 14 min
What User B sees:  You → 14 min |  Zara → 3 min
```

### `POST /api/eta/start`

```js
// app/api/eta/start/route.js
import { connectDB }              from "@/lib/mongodb"
import EtaTracking                from "@/models/EtaTracking"
import Hangout                    from "@/models/Hangout"
import { distanceMatrix, geocodeAddress } from "@/lib/rapidapi"
import { pusherServer }           from "@/lib/pusher"
import { NextResponse }           from "next/server"

export async function POST(req) {
  await connectDB()
  const { hangoutId, venueAddress } = await req.json()

  const venueCoords = await geocodeAddress(venueAddress)
  const members     = await EtaTracking.find({ hangoutId })

  const etas = await Promise.all(
    members.map(async (m) => {
      const etaMinutes = await distanceMatrix(m.currentLat, m.currentLng, venueCoords.lat, venueCoords.lng)
      await EtaTracking.findByIdAndUpdate(m._id, { etaMinutes })
      return { userId: m.userId.toString(), etaMinutes }
    })
  )

  // Push to hangout channel — only etaMinutes, never coordinates
  await pusherServer.trigger(`hangout-${hangoutId}`, "eta-update", { etas })

  return NextResponse.json({ etas })
}
```

### `POST /api/eta/ping` — called every 30 seconds while en route

```js
// app/api/eta/ping/route.js
import { connectDB }    from "@/lib/mongodb"
import EtaTracking      from "@/models/EtaTracking"
import LocationPing     from "@/models/LocationPing"
import Hangout          from "@/models/Hangout"
import { distanceMatrix } from "@/lib/rapidapi"
import { haversine }    from "@/lib/geo"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req) {
  await connectDB()
  const { hangoutId, userId, lat, lng } = await req.json()

  // Fake GPS detection — velocity check
  const lastPing = await LocationPing.findOne({ userId }).sort({ createdAt: -1 })
  if (lastPing) {
    const distKm    = haversine(lastPing.lat, lastPing.lng, lat, lng)
    const timeHours = (Date.now() - new Date(lastPing.createdAt).getTime()) / 3_600_000
    const speedKmh  = distKm / timeHours

    await LocationPing.create({ userId, lat, lng, speedKmh: Math.round(speedKmh), isSuspicious: speedKmh > 200 })

    // Silently reject — do not update ETA if speed is impossibly high
    if (speedKmh > 200) return NextResponse.json({ flagged: true })
  } else {
    await LocationPing.create({ userId, lat, lng, speedKmh: 0 })
  }

  const hangout    = await Hangout.findById(hangoutId)
  const etaMinutes = await distanceMatrix(
    lat, lng,
    hangout.venueLocation.coordinates[1],
    hangout.venueLocation.coordinates[0]
  )

  // Update server-side record (currentLat/currentLng stay server-only)
  await EtaTracking.findOneAndUpdate(
    { hangoutId, userId },
    { currentLat: lat, currentLng: lng, etaMinutes, lastUpdated: new Date() }
  )

  // Push ONLY etaMinutes to other clients — never coordinates
  await pusherServer.trigger(`hangout-${hangoutId}`, "eta-update", { userId, etaMinutes })

  return NextResponse.json({ etaMinutes })
}
```

### `POST /api/eta/arrived`

```js
// app/api/eta/arrived/route.js
import { connectDB }    from "@/lib/mongodb"
import EtaTracking      from "@/models/EtaTracking"
import Hangout          from "@/models/Hangout"
import Message          from "@/models/Message"
import User             from "@/models/User"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req) {
  await connectDB()
  const { hangoutId, userId } = await req.json()

  await EtaTracking.findOneAndUpdate({ hangoutId, userId }, { arrived: true, etaMinutes: 0 })

  const hangout = await Hangout.findById(hangoutId)
  const user    = await User.findById(userId).select("displayName username")
  const name    = user.displayName || user.username

  await Message.create({
    roomId:  hangout.chatRoomId,
    msgType: "system",
    content: `${name} has arrived at ${hangout.venueName}`,
  })

  await pusherServer.trigger(`hangout-${hangoutId}`, "member-arrived", {
    userId, name, venueName: hangout.venueName,
  })

  return NextResponse.json({ success: true })
}
```

---

## 📱 Key Frontend Components

### `components/SignalBroadcaster.jsx`

```jsx
"use client"
import { useState } from "react"

const VIBES   = ["chill", "coffee", "food", "walk", "drinks", "anything"]
const WINDOWS = [30, 60, 120]
const RADII   = [1, 3, 10]

export function SignalBroadcaster({ userId }) {
  const [vibe,     setVibe]     = useState("chill")
  const [window,   setWindow]   = useState(30)
  const [radius,   setRadius]   = useState(3)
  const [ghost,    setGhost]    = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [publicBio, setPublicBio] = useState("")
  const [loading,  setLoading]  = useState(false)

  async function broadcast() {
    setLoading(true)
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
    const expiresAt = new Date(Date.now() + window * 60 * 1000).toISOString()

    await fetch("/api/signals", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        userId, vibe, windowMinutes: window, radiusKm: radius,
        isGhost: ghost, isPublic, publicBio,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        expiresAt,
      }),
    })
    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Vibe selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {VIBES.map(v => (
          <button key={v} onClick={() => setVibe(v)} className={`vibe-${v}`}
            style={{ padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              fontWeight: vibe === v ? 700 : 400 }}>
            {v}
          </button>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {WINDOWS.map(w => (
          <button key={w} onClick={() => setWindow(w)}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd",
              background: window === w ? "#534AB7" : "#fff",
              color: window === w ? "#fff" : "#000", cursor: "pointer" }}>
            {w} min
          </button>
        ))}
      </div>

      {/* Radius selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {RADII.map(r => (
          <button key={r} onClick={() => setRadius(r)}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd",
              background: radius === r ? "#534AB7" : "#fff",
              color: radius === r ? "#fff" : "#000", cursor: "pointer" }}>
            {r} km
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={ghost} onChange={e => setGhost(e.target.checked)} />
          Ghost mode
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
          Public mode
        </label>
      </div>

      {isPublic && (
        <input value={publicBio} onChange={e => setPublicBio(e.target.value)}
          maxLength={140}
          placeholder="What are you up for? (140 chars)"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1px solid #ddd", marginBottom: 16, fontSize: 14 }} />
      )}

      <button onClick={broadcast} disabled={loading}
        style={{ width: "100%", padding: "14px 0", borderRadius: 12,
          background: "#534AB7", color: "#EEEDFE",
          border: "none", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
        {loading ? "Dropping…" : "Drop signal"}
      </button>
    </div>
  )
}
```

---

### `components/EtaTracker.jsx`

```jsx
"use client"
import { useEffect, useState } from "react"
import { pusherClient } from "@/lib/pusher"

export function EtaTracker({ hangoutId, userId, venueName }) {
  const [etas,    setEtas]    = useState([])
  const [arrived, setArrived] = useState(false)

  useEffect(() => {
    const channel = pusherClient.subscribe(`hangout-${hangoutId}`)

    channel.bind("eta-update", ({ userId: uid, etaMinutes, etas: allEtas }) => {
      if (allEtas) {
        setEtas(allEtas)
      } else {
        setEtas(prev => prev.map(e => e.userId === uid ? { ...e, etaMinutes } : e))
      }
    })

    channel.bind("member-arrived", ({ userId: uid }) => {
      setEtas(prev => prev.map(e => e.userId === uid ? { ...e, arrived: true } : e))
    })

    return () => pusherClient.unsubscribe(`hangout-${hangoutId}`)
  }, [hangoutId])

  // GPS ping every 30 seconds
  useEffect(() => {
    if (arrived) return
    const interval = setInterval(async () => {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      await fetch("/api/eta/ping", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ hangoutId, userId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [arrived, hangoutId, userId])

  async function markArrived() {
    setArrived(true)
    await fetch("/api/eta/arrived", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ hangoutId, userId }),
    })
  }

  return (
    <div style={{ padding: 16 }}>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>heading to {venueName}</p>

      {etas.map(e => (
        <div key={e.userId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>{e.userId === userId ? "You" : e.displayName}</span>
          {e.arrived
            ? <span style={{ fontSize: 14, color: "#1D9E75", fontWeight: 600 }}>arrived ✓</span>
            : <span style={{ fontSize: 14, fontWeight: 600 }}>{e.etaMinutes} min</span>
          }
        </div>
      ))}

      {!arrived && (
        <button onClick={markArrived} style={{
          width: "100%", marginTop: 12,
          background: "#1D9E75", color: "#E1F5EE",
          border: "none", borderRadius: 10,
          padding: "12px 0", fontSize: 14, cursor: "pointer",
        }}>
          I'm here
        </button>
      )}
    </div>
  )
}
```

---

### `components/LocationGate.jsx`

```jsx
"use client"
import { useEffect, useState } from "react"

export function LocationGate({ children }) {
  const [status, setStatus] = useState("pending")

  useEffect(() => {
    navigator.permissions.query({ name: "geolocation" }).then(result => {
      if (result.state === "granted") setStatus("granted")
      else if (result.state === "denied") setStatus("denied")
    })
  }, [])

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      () => setStatus("granted"),
      () => setStatus("denied")
    )
  }

  if (status === "granted") return children

  if (status === "denied") return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>Location access needed</p>
      <p style={{ fontSize: 13, color: "#888" }}>
        Enable location in your browser settings and reload.
      </p>
    </div>
  )

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>One permission needed</p>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
        DropIn uses your location to find people nearby and show arrival times.
        Your exact GPS stays on our servers — other users only see how many minutes away you are. Never your address.
      </p>
      <button onClick={requestLocation} style={{
        background: "#534AB7", color: "#EEEDFE",
        border: "none", borderRadius: 10,
        padding: "12px 28px", fontSize: 14, cursor: "pointer",
      }}>
        Allow location
      </button>
    </div>
  )
}
```

---

## 🎨 Design System

```css
/* app/globals.css */
:root {
  --brand-purple:       #534AB7;
  --brand-purple-light: #EEEDFE;
  --brand-teal:         #1D9E75;
  --brand-teal-light:   #E1F5EE;
  --brand-amber:        #BA7517;
  --brand-amber-light:  #FAEEDA;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-pill: 999px;
}

.vibe-chill    { background: #EEEDFE; color: #534AB7; }
.vibe-coffee   { background: #FAEEDA; color: #854F0B; }
.vibe-food     { background: #EAF3DE; color: #3B6D11; }
.vibe-walk     { background: #E1F5EE; color: #0F6E56; }
.vibe-drinks   { background: #FAECE7; color: #993C1D; }
.vibe-anything { background: #E6F1FB; color: #185FA5; }
```

---

## 🛡️ Safety Layer

Build before launching Public Discovery:

| Feature | Implementation |
|---|---|
| Block system | Single tap, instant, both-direction. Blocked IDs excluded in every MongoDB query via `$nin`. |
| Community rating | Post-hangout 1–5 stars in `Rating` model. Averaged into `PublicProfile.communityRating`. Below 3.5 → discovery radius capped to 500m. Below 2.5 → suspended. |
| Fuzzy location | Always add ~400m random offset (`fuzzLocation()`) before any coordinate reaches a client. |
| Fake GPS | Velocity check on every `/api/eta/ping`. Speed > 200 km/h → silently reject ping, log to `LocationPing`. |
| Report system | 3 reports from different users → flagged. 5 reports → auto-suspend pending review. |
| SOS button | Always visible on active hangout screen. Sends GPS + timestamp via `tel:` link to emergency contacts. |
| Gender/age filters | Symmetric filters stored in `PublicProfile`, applied server-side in every discover query. |
| Auto-expire chats | If no venue locked within signal window, chat room set to read-only. |

---

## 🚀 Build Order

| Session | Focus | Time |
|---|---|---|
| 1 | MongoDB Atlas, Next.js init, Mongoose models, NextAuth | 2 hrs |
| 2 | SignalBroadcaster, geolocation, POST /api/signals | 2 hrs |
| 3 | Pusher setup, FriendRadar with live updates, Drop In button | 2 hrs |
| 4 | RapidAPI Places + Gemini AI spot picker, SpotCard UI, lock in venue | 2 hrs |
| 5 | Active hangout, EtaTracker, arrival flow, Gemini memory card | 2 hrs |
| 6 | Journal timeline UI, stats, Profile + friend tier drag | 2 hrs |
| 7 | Public discover feed, vibe match scoring, real-time badge | 2 hrs |
| 8 | Chat room, venue vote cards, group invite, lock in from chat | 2 hrs |
| 9 | Safety layer: block, report, community rating, SOS, age/gender filters | 2 hrs |

---

## ✅ MVP Launch Checklist

- [ ] User can sign up / log in via NextAuth
- [ ] User can broadcast a signal (vibe + window + radius + ghost/public)
- [ ] Friends see incoming signals in real-time via Pusher
- [ ] Friend can drop in on a signal
- [ ] **Gemini AI** picks top 3 venues using **RapidAPI** Places data
- [ ] Group can lock in a venue
- [ ] ETA tracker shows travel minutes — never raw GPS
- [ ] "I'm here" button marks arrival, pushes notification to group
- [ ] **Gemini AI** generates a memory card when hangout ends (saved to MongoDB)
- [ ] Journal shows past hangouts with memory cards
- [ ] Signals auto-expire (`expiresAt` checked on every query)
- [ ] Public discovery feed shows nearby vibe-matched strangers
- [ ] Real-time DM chat works via Pusher
- [ ] In-chat venue voting with live vote counts
- [ ] Block system works instantly on both sides
- [ ] SOS button visible and functional on active hangout screen
- [ ] Exact GPS is NEVER exposed to other clients

---

*Built with Next.js (JavaScript) · MongoDB + Mongoose · Google Gemini API · RapidAPI · Pusher*
