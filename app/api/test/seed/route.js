import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Signal from "@/models/Signal"
import Friendship from "@/models/Friendship"
import mongoose from "mongoose"

export async function GET(req) {
  try {
    await connectDB()

    // 1. Create Dummy Users
    const dummyUsersData = [
      { email: "zain@example.com", username: "zain_alpha", displayName: "Zain Malik", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zain" },
      { email: "sarah@example.com", username: "sarah_joy", displayName: "Sarah Khan", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
      { email: "ali@example.com", username: "ali_vibes", displayName: "Ali Hassan", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali" },
      { email: "dua@example.com", username: "dua_l", displayName: "Dua Fatima", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dua" },
      { email: "omar@example.com", username: "omar_r", displayName: "Omar Rizwan", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Omar" },
    ]

    const users = []
    for (const data of dummyUsersData) {
      let user = await User.findOne({ email: data.email })
      if (!user) {
        user = await User.create({ ...data, passwordHash: "dummy" })
      }
      users.push(user)
    }

    // 2. Create Public Signals near Lahore (Default location)
    const baseLat = 31.5204
    const baseLng = 74.3587
    
    const vibes = ["coffee", "food", "walk", "drinks", "chill", "anything"]
    
    // Clear old dummy signals
    await Signal.deleteMany({ isPublic: true, status: "active", userId: { $in: users.map(u => u._id) } })

    const signals = []
    for (let i = 0; i < users.length; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.02
      const offsetLng = (Math.random() - 0.5) * 0.02
      
      const signal = await Signal.create({
        userId: users[i]._id,
        vibe: vibes[i % vibes.length],
        windowMinutes: 60,
        radiusKm: 3,
        isGhost: false,
        isPublic: true,
        publicBio: `Hey! I'm around for some ${vibes[i % vibes.length]}. Join me!`,
        location: { type: "Point", coordinates: [baseLng + offsetLng, baseLat + offsetLat] },
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        status: "active"
      })
      signals.push(signal)
    }

    return Response.json({
      success: true,
      message: "Seeded dummy data successfully",
      usersCreated: users.length,
      signalsCreated: signals.length
    })
  } catch (error) {
    console.error("Seeding failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
