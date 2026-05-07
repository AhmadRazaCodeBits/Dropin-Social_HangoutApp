import { connectDB } from "@/lib/mongodb"
import Signal from "@/models/Signal"
import User from "@/models/User"
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin || admin.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 })

    const query = {}
    if (status === 'active') query.status = 'active'
    if (status === 'expired') query.status = 'expired'

    const signals = await Signal.find(query).populate('userId', 'displayName email').sort({ createdAt: -1 })
    return Response.json({ signals })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    await connectDB()
    const { signalId, updates } = await req.json()
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin || admin.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 })

    const signal = await Signal.findByIdAndUpdate(signalId, updates, { new: true })
    return Response.json({ signal })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    await connectDB()
    const { signalId } = await req.json()
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin || admin.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 })

    await Signal.findByIdAndDelete(signalId)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
