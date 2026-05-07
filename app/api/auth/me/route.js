import { connectDB } from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { verifySessionToken } from "../../../../lib/session"

export async function GET(req) {
  try {
    await connectDB()
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload || !payload.userId) return new Response(JSON.stringify({ ok: false }), { status: 200 })

    const user = await User.findById(payload.userId).select("email displayName avatarUrl phone phoneVerified isAdmin")
    if (!user) return new Response(JSON.stringify({ ok: false }), { status: 200 })

    return new Response(JSON.stringify({ ok: true, user }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
