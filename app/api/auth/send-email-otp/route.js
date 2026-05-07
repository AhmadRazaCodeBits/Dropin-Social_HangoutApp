import { connectDB } from "../../../../lib/mongodb"
import Otp from "../../../../models/Otp"
import { MailtrapClient } from "mailtrap"

const WINDOW_MS = 15 * 60 * 1000
const EMAIL_LIMIT = 3
const IP_LIMIT = 10

function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

async function sendEmail(to, subject, text) {
  const token = process.env.MAILTRAP_API_KEY || process.env.MAILTRAP_API_TOKEN || process.env.MAILTRAP_TOKEN
  const isSandbox = String(process.env.MAILTRAP_USE_SANDBOX || "false").toLowerCase() === "true"
  const senderEmail = process.env.MAILTRAP_FROM_EMAIL || (isSandbox ? "sandbox@example.com" : "no-reply@your-domain.com")
  const senderName = process.env.MAILTRAP_FROM_NAME || "DropIn"
  const testInboxId = isSandbox ? Number(process.env.MAILTRAP_INBOX_ID) : undefined
  if (!token) return null

  const client = new MailtrapClient({
    token,
    sandbox: isSandbox,
    testInboxId,
  })
  return client.send({
    from: {
      email: senderEmail,
      name: senderName,
    },
    to: [{ email: to }],
    subject,
    text,
    category: "Email Verification",
  })
}

export async function POST(req) {
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 })

    const ip = getClientIp(req)
    const since = new Date(Date.now() - WINDOW_MS)
    const emailCount = await Otp.countDocuments({ email, channel: "email", createdAt: { $gte: since } })
    const ipCount = await Otp.countDocuments({ ip, channel: "email", createdAt: { $gte: since } })
    if (emailCount >= EMAIL_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many OTP requests for this email. Try again later." }), { status: 429 })
    }
    if (ipCount >= IP_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many OTP requests from this device. Try again later." }), { status: 429 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await Otp.create({ email, channel: "email", code, expiresAt, ip })

    const subject = "Your DropIn verification code"
    const text = `Your DropIn verification code is: ${code}`
    let result = null
    try {
      result = await sendEmail(email, subject, text)
    } catch (err) {
      if (String(err?.message || "").toLowerCase().includes("unauthorized")) {
        console.error("Email send error: Mailtrap token is unauthorized or sandbox sender/domain is not allowed for this token.")
      } else {
        console.error("Email send error:", err.message)
      }
    }

    const devReturn = { sent: !!result, dev: !result }
    if (!result) {
      devReturn.code = code
    }

    return new Response(JSON.stringify(devReturn), { status: 200 })
  } catch (err) {
    console.error(err)
    const status = err?.statusCode || err?.status || 500
    return new Response(JSON.stringify({ error: err.message }), { status })
  }
}
