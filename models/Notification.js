import mongoose from "mongoose"

const NotificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:    { type: String, required: true, enum: ["signal", "chat", "hangout", "system", "friend_request"] },
  title:   { type: String, required: true },
  content: { type: String, required: true },
  read:    { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

NotificationSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)
