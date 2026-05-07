import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { verifySessionToken } from "@/lib/session"

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { userId: reportedId } = params

    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const reporterId = payload.userId

    if (reporterId === reportedId) return Response.json({ error: "Cannot block yourself" }, { status: 400 })

    await User.findByIdAndUpdate(reporterId, {
      $addToSet: { blockedUsers: reportedId }
    })

    return Response.json({ ok: true, message: "User blocked" })
  } catch (err) {
    console.error(err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
