import { connectDB } from "../../../../lib/mongodb"
import Otp from "../../../../models/Otp"

async function sendSmsViaRapidApi(phone) {
  const key = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_SMS_HOST || "sms-verify3.p.rapidapi.com"
  if (!key) return null

  const res = await fetch(`https://${host}/send-numeric-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": host,
      "x-rapidapi-key": key,
    },
    body: JSON.stringify({ target: phone }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.message || data?.error || `RapidAPI SMS error: ${res.status}`
    throw new Error(message)
  }

  return data
}

async function sendWhatsAppViaTwilio(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from) return null

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const params = new URLSearchParams({ To: `whatsapp:${to}`, From: from, Body: body })

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twilio error: ${text}`)
  }

  return res.json()
}

const WINDOW_MS = 15 * 60 * 1000
const PHONE_LIMIT = 3
const IP_LIMIT = 10

function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req) {
  try {
    await connectDB()
    const { phone, channel } = await req.json()
    if (!phone) return new Response(JSON.stringify({ error: "Missing phone" }), { status: 400 })

    const sendChannel = channel === "whatsapp" ? "whatsapp" : "sms"

    const ip = getClientIp(req)
    const since = new Date(Date.now() - WINDOW_MS)
    const phoneCount = await Otp.countDocuments({ phone, channel: sendChannel, createdAt: { $gte: since } })
    const ipCount = await Otp.countDocuments({ ip, channel: sendChannel, createdAt: { $gte: since } })
    if (phoneCount >= PHONE_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many OTP requests for this phone. Try again later." }), { status: 429 })
    }
    if (ipCount >= IP_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many OTP requests from this device. Try again later." }), { status: 429 })
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    let result = null
    let code = null
    try {
      if (sendChannel === "sms") {
        result = await sendSmsViaRapidApi(phone)
        code = result?.verify_code || null
      } else {
        const body = `Your DropIn verification code is: ${Math.floor(100000 + Math.random() * 900000).toString()}`
        code = body.match(/\d{6}/)?.[0] || null
        result = await sendWhatsAppViaTwilio(phone, body)
      }
    } catch (err) {
      console.error("OTP send error:", err.message)
    }

    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString()
    }

    await Otp.create({ phone, channel: sendChannel, code, expiresAt, ip })

    const devReturn = { sent: !!result, dev: !result }
    if (!result) {
      // for dev, include the code in response so developer can test
      devReturn.code = code
    }

    return new Response(JSON.stringify(devReturn), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
