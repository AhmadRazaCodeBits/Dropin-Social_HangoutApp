import { connectDB } from "../../../lib/mongodb"
import User from "../../../models/User"
import { verifySessionToken } from "../../../lib/session"

export async function POST(req) {
  try {
    await connectDB()
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload || !payload.userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const body = await req.json()
    const { avatarUrl, phone, city, address, publicBio } = body

    const update = {}
    if (typeof avatarUrl === "string") update.avatarUrl = avatarUrl
    if (typeof phone === "string") update.phone = phone
    if (typeof city === "string") update.city = city
    if (typeof address === "string") update.address = address
    if (typeof publicBio === "string") update.publicBio = publicBio

    const user = await User.findByIdAndUpdate(payload.userId, update, { new: true }).select("email displayName avatarUrl phone phoneVerified city publicBio isAdmin")

    return new Response(JSON.stringify({ ok: true, user }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
