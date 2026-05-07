import crypto from "crypto"

function getSecret() {
  return process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET
}

export function createSessionToken(payload, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const secret = getSecret()
  if (!secret) {
    throw new Error("Missing SESSION_SECRET or NEXTAUTH_SECRET")
  }

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString(
    "base64url"
  )
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

export function buildSessionCookie(token, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const isProd = process.env.NODE_ENV === "production"
  return `dropin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds};${isProd ? " Secure;" : ""}`
}

export function verifySessionToken(token) {
  try {
    const secret = getSecret()
    if (!secret) throw new Error("Missing session secret")
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch (err) {
    return null
  }
}
