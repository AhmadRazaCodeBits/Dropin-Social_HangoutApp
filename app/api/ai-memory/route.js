import { generateOpenRouterText, getOpenRouterModelName } from "@/lib/openrouter"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export async function POST(req) {
  try {
    const { venue, members, vibe, durationMinutes } = await req.json()

    if (!venue?.name || !venue?.address) {
      return badRequest("venue.name and venue.address are required")
    }

    if (!Array.isArray(members) || members.length === 0) {
      return badRequest("members must be a non-empty array")
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return badRequest("durationMinutes must be a positive number")
    }

    const prompt = `
Write a short, warm, poetic memory card for a spontaneous hangout.

Details:
- Where: ${venue.name}, ${venue.address}
- Who: ${members.map((m) => m.displayName).join(", ")}
- Vibe: ${vibe}
- Duration: ${durationMinutes} minutes

Write 2 sentences max. Make it feel like a memory from a diary - specific, warm, slightly lyrical.
Don't use their names, just "you all" or "everyone".
Don't start with "I". Don't be generic.

Examples of good tone:
- "A Tuesday afternoon that turned into two hours of coffee and absurd conversation at a corner table no one planned for."
- "Somehow a 30-minute walk became the best part of the week."

Respond with ONLY the memory text, nothing else.
`

    const memory = await generateOpenRouterText(prompt, { maxTokens: 180, temperature: 0.45 })
    return Response.json({ model: getOpenRouterModelName(), memory })
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to generate hangout memory" },
      { status: 500 }
    )
  }
}
