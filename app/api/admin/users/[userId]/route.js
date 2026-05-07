import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { verifySessionToken } from "@/lib/session"

export async function PATCH(req, { params }) {
  try {
    await connectDB()
    const { userId } = params
    const { action } = await req.json()

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

    const actions = {
      suspend:  { publicSuspended: true },
      restore:  { publicSuspended: false, flagCount: 0 },
      flag:     { $inc: { flagCount: 1 } },
      warn:     { $inc: { warnCount: 1 } },
      verify:   { isIdVerified: true },
      make_mod: { role: 'moderator' },
    }

    if (!actions[action]) return Response.json({ error: 'invalid action' }, { status: 400 })
    
    const user = await User.findByIdAndUpdate(userId, actions[action], { new: true })
    
    return Response.json({ user })
  } catch (err) {
    console.error(err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
