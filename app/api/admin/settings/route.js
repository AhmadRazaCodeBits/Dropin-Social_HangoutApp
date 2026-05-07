import { connectDB } from "@/lib/mongodb"
import { AppSettings } from "@/models/System"
import User from "@/models/User"
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    
    const admin = await User.findById(payload.userId)
    if (!admin?.role || (admin.role !== 'admin' && admin.role !== 'moderator')) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await AppSettings.find()
    return Response.json({ settings })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    await connectDB()
    const { updates } = await req.json()   // [{ key, value }]
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    for (const { key, value } of updates) {
      await AppSettings.findOneAndUpdate({ key }, { value }, { upsert: true })
    }
    
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
