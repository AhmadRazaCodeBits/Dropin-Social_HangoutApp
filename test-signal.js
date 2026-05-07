import { connectDB } from "./lib/mongodb.js"
import Signal from "./models/Signal.js"
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function test() {
  try {
    await connectDB()
    const signal = await Signal.create({
      userId: "661111111111111111111111",
      vibe: "chill",
      windowMinutes: 30,
      radiusKm: 3,
      isGhost: false,
      location: { type: "Point", coordinates: [-73.9897, 40.7411] },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    })
    console.log("Success:", signal._id)
  } catch (err) {
    console.error("Error creating signal:", err)
  }
  mongoose.disconnect()
}

test()
