import { connectDB }    from "@/lib/mongodb"
import Hangout          from "@/models/Hangout"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const page   = parseInt(searchParams.get("page") || "1", 10)
    const limit  = parseInt(searchParams.get("limit") || "20", 10)

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const skip = (page - 1) * limit

    const hangouts = await Hangout.find({ endedAt: { $ne: null } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Hangout.countDocuments({ endedAt: { $ne: null } })

    return NextResponse.json({
      hangouts: hangouts.map((h) => ({
        _id: h._id,
        venueName: h.venueName,
        venueAddress: h.venueAddress,
        vibe: h.vibe || "anything",
        aiMemory: h.aiMemory,
        aiReason: h.aiReason,
        createdAt: h.createdAt,
        endedAt: h.endedAt,
        members: [],
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error("Journal API error:", error)
    return NextResponse.json({ error: "Failed to fetch journal" }, { status: 500 })
  }
}
