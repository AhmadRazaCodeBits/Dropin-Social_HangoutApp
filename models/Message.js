import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    content: String,
    msgType: { type: String, enum: ["text", "venue_vote", "system", "image", "sticker", "location", "voice"], default: "text" },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
)

if (mongoose.models.Message) {
  delete mongoose.models.Message
}

export default mongoose.model("Message", MessageSchema)
