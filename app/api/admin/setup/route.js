import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    await connectDB()
    
    const email = "admin@dropin.com"
    const password = "AdminPassword123!"
    const username = "admin"

    const existing = await User.findOne({ email })
    if (existing) {
      existing.isAdmin = true
      await existing.save()
      return Response.json({ message: "Existing user promoted to Admin", email })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await User.create({
      email,
      username,
      displayName: "System Admin",
      isAdmin: true,
      passwordHash
    })

    return Response.json({ message: "Admin user created successfully", email, password })
  } catch (err) {
    console.error("Setup Error:", err)
    return Response.json({ error: "Failed to setup admin", details: err.message }, { status: 500 })
  }
}
