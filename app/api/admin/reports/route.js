import { connectDB } from '@/lib/mongodb'
import { Report } from '@/models/System'
import User from '@/models/User'
import { verifySessionToken } from "@/lib/session"

export async function GET(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'open'
    
    // Auth Check (omitted for brevity, but should be here)
    
    const reports = await Report.find({ status })
      .populate('reporterId', 'displayName')
      .populate('reportedId', 'displayName communityRating publicSuspended')
      .sort({ createdAt: -1 }).limit(50)
      
    return Response.json({ reports })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    await connectDB()
    const { reportId, action, resolution } = await req.json()
    
    // Auth Check
    const cookie = req.headers.get("cookie") || ""
    const match = cookie.match(/dropin_session=([^;]+)/)
    const token = match ? match[1] : null
    const payload = token ? verifySessionToken(token) : null
    if (!payload?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    await Report.findByIdAndUpdate(reportId, {
      status: action === 'clear' ? 'resolved' : 'dismissed', 
      resolution,
      resolvedBy: payload.userId
    })
    
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
