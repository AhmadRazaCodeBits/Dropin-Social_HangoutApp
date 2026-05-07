import { connectDB } from "../../../../lib/mongodb"
import Otp from "../../../../models/Otp"

export async function POST(req) {
  try {
    await connectDB()
    const { phone, email, code, channel } = await req.json()
    if (!code || !channel) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })

    const query = { code, used: false, channel }
    if (channel === "sms") query.phone = phone
    if (channel === "email") query.email = email
    if (!query.phone && !query.email) return new Response(JSON.stringify({ error: "Missing target" }), { status: 400 })

    const otp = await Otp.findOne(query).sort({ createdAt: -1 })
    if (!otp) return new Response(JSON.stringify({ ok: false, error: "Invalid code" }), { status: 400 })
    if (otp.expiresAt < new Date()) return new Response(JSON.stringify({ ok: false, error: "Code expired" }), { status: 400 })

    otp.used = true
    await otp.save()

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
