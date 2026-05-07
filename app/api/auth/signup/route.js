import { connectDB } from "../../../../lib/mongodb"
import User from "../../../../models/User"
// no session creation on signup; user must log in explicitly
import bcrypt from "bcryptjs"

function makeUsernameBase(name, email) {
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)
  if (email) return email.split("@")[0]
  return `user${Math.floor(Math.random() * 9000) + 1000}`
}

export async function POST(req) {
  try {
    await connectDB()
    const { name, phone, email, password } = await req.json()
    if (!email || !password || !name) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })

    // No OTP/email verification required for signup: accept email/phone/password

    // ensure email/phone uniqueness
    const existingEmail = await User.findOne({ email })
    if (existingEmail) return new Response(JSON.stringify({ error: "Email already used" }), { status: 400 })
    if (phone) {
      const existingPhone = await User.findOne({ phone })
      if (existingPhone) return new Response(JSON.stringify({ error: "Phone already used" }), { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let usernameBase = makeUsernameBase(name, email)
    let username = usernameBase
    let i = 0
    while (await User.findOne({ username })) {
      i++
      username = `${usernameBase}${i}`
      if (i > 50) break
    }

    const user = await User.create({
      email,
      username,
      displayName: name,
      phone,
      phoneVerified: !!phone,
      emailVerified: true,
      passwordHash,
    })

    return new Response(JSON.stringify({ ok: true, id: user._id }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
