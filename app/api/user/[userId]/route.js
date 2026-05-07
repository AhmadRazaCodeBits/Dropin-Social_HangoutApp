import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Signal from "@/models/Signal"

export async function GET(req, { params }) {
  try {
    await connectDB()
    const { userId } = params
    
    const user = await User.findById(userId).select("displayName avatarUrl isIdVerified communityRating totalPublicHangouts bio currentVibe lastActive updatedAt createdAt")
    
    if (!user) return Response.json({ error: "User not found" }, { status: 404 })

    // Check if user has an active signal
    const signal = await Signal.findOne({ userId, status: 'active', expiresAt: { $gt: new Date() } })
    
    return Response.json({ 
      user: {
        ...user._doc,
        currentVibe: signal?.vibe || user.currentVibe || 'anything',
        isActive: signal ? true : false
      }
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
