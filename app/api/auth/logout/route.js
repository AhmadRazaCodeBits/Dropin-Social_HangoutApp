import { buildSessionCookie } from "../../../../lib/session"

export async function POST(req) {
  try {
    // Clear cookie by setting Max-Age=0
    const headers = new Headers({ "Set-Cookie": `dropin_session=; Path=/; HttpOnly; Max-Age=0;` })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
