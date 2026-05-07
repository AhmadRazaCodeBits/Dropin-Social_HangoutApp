import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Signal from '@/models/Signal'
import ChatRoom from '@/models/ChatRoom'
import Message from '@/models/Message'
import { Report, Rating } from '@/models/System'
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
    
    const user = await User.findById(payload.userId)
    if (!user?.role || (user.role !== 'admin' && user.role !== 'moderator')) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const today = new Date(); today.setHours(0,0,0,0)

    const [
      totalUsers, newUsersToday, activeSignals, publicSignals,
      roomsToday, avgRatingArr, openReports, vibeBreakdown
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Signal.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
      Signal.countDocuments({ status: 'active', isPublic: true, expiresAt: { $gt: new Date() } }),
      ChatRoom.countDocuments({ createdAt: { $gte: today } }),
      Rating.aggregate([{ $group: { _id: null, avg: { $avg: '$score' } } }]),
      Report.countDocuments({ status: 'open' }),
      Signal.aggregate([
        { $match: { status: 'active', expiresAt: { $gt: new Date() } } },
        { $group: { _id: '$vibe', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ])

    return Response.json({
      stats: {
        totalUsers, 
        newUsersToday, 
        activeSignals, 
        publicSignals,
        roomsToday, 
        openReports, 
        vibeBreakdown,
        avgRating: avgRatingArr[0]?.avg?.toFixed(1) || 0,
        publicVsPrivate: { public: publicSignals, private: activeSignals - publicSignals }
      }
    })
  } catch (err) {
    console.error("Admin Stats API Error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
