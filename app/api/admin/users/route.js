import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
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

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const page   = parseInt(searchParams.get('page') || '1')
    const limit  = 20

    const query = {}
    if (search) query.$or = [
      { displayName: { $regex: search, $options: 'i' } },
      { email:       { $regex: search, $options: 'i' } },
      { username:    { $regex: search, $options: 'i' } },
    ]
    if (filter === 'verified')   query.isIdVerified = true
    if (filter === 'suspended')  query.publicSuspended = true
    if (filter === 'low_rating') query.communityRating = { $lt: 3.5 }
    if (filter === 'flagged')    query.flagCount = { $gte: 1 }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('displayName email communityRating totalPublicHangouts isIdVerified publicSuspended role flagCount createdAt username')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(query)
    ])
    return Response.json({ users, total, pages: Math.ceil(total / limit) })
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
