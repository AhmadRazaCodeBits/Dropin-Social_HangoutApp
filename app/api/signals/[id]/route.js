import { connectDB } from "@/lib/mongodb"
import Signal from "@/models/Signal"

export async function DELETE(req, { params }) {
  try {
    await connectDB()
    const { id } = params
    
    // Parse userId from URL or authorization headers if applicable
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 })
    }

    const signal = await Signal.findById(id)
    if (!signal) {
      return Response.json({ error: "Signal not found" }, { status: 404 })
    }

    if (signal.userId.toString() !== userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await Signal.deleteOne({ _id: id })

    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/signals/[id] failed:", error)
    return Response.json({ error: "Failed to delete signal" }, { status: 500 })
  }
}
