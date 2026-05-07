import { connectDB } from "../../../../lib/mongodb"
import Feature from "../../../../models/Feature"
import User from "../../../../models/User"
import { verifySessionToken } from "../../../../lib/session"

export async function POST(req) {
  try {
    await connectDB()
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload || !payload.userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const user = await User.findById(payload.userId)
    if (!user || !user.isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })

    const body = await req.json()
    const { name, description, metadata } = body
    if (!name) return new Response(JSON.stringify({ error: "Missing name" }), { status: 400 })

    const feature = await Feature.create({ name, description, metadata, createdBy: user._id })
    return new Response(JSON.stringify({ ok: true, feature }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    await connectDB()
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload || !payload.userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const user = await User.findById(payload.userId)
    if (!user || !user.isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 })

    const removed = await Feature.findByIdAndDelete(id)
    if (!removed) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
