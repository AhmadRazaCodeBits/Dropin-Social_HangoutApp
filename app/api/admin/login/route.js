import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { buildSessionCookie, createSessionToken } from "@/lib/session"
import bcrypt from "bcryptjs"

export async function POST(req) {
  try {
    await connectDB()
    const { email, password } = await req.json()
    if (!email || !password) return Response.json({ error: "Missing fields" }, { status: 400 })

    const user = await User.findOne({ email })
    if (!user || !user.passwordHash) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify Admin Status
    if (!user.isAdmin) {
      return Response.json({ error: "Access denied: Not an administrator" }, { status: 403 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 })

    const token = createSessionToken({ userId: user._id.toString(), email: user.email })
    const headers = new Headers({ "Set-Cookie": buildSessionCookie(token) })

    return Response.json({ ok: true, id: user._id }, { status: 200, headers })
  } catch (err) {
    console.error("Admin Login Error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
