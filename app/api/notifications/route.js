import { connectDB }     from "@/lib/mongodb"
import Notification      from "@/models/Notification"
import { NextResponse }  from "next/server"

export async function GET(req) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const unreadCount = await Notification.countDocuments({ userId, read: false })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await connectDB()

    const body = await req.json()

    if (body.markRead) {
      await Notification.updateMany(
        { userId: body.userId, read: false },
        { $set: { read: true } }
      )
      return NextResponse.json({ success: true })
    }

    const notification = await Notification.create({
      userId:   body.userId,
      type:     body.type,
      title:    body.title,
      content:  body.content,
      metadata: body.metadata,
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: "Failed to process notification" }, { status: 500 })
  }
}
