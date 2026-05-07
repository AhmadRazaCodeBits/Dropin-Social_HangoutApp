import { connectDB } from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { buildSessionCookie, createSessionToken } from "../../../../lib/session"
import bcrypt from "bcryptjs"

export async function POST(req) {
  try {
    await connectDB()
    const { email, password } = await req.json()
    if (!email || !password) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })

    const user = await User.findOne({ email })
    if (!user || !user.passwordHash) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 })

    const token = createSessionToken({ userId: user._id.toString(), email: user.email })
    const headers = new Headers({ "Set-Cookie": buildSessionCookie(token) })

    return new Response(JSON.stringify({ ok: true, id: user._id }), { status: 200, headers })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
