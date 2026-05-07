import mongoose from "mongoose"

const HangoutSchema = new mongoose.Schema(
  {
    signalId: { type: mongoose.Schema.Types.ObjectId, ref: "Signal" },
    venueName: String,
    venueAddress: String,
    venueLocation: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    vibe: {
      type: String,
      enum: ["chill", "coffee", "food", "walk", "drinks", "anything"],
      default: "anything",
    },
    aiReason: String,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    aiMemory: String,
    chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom" },
  },
  { timestamps: true }
)

export default mongoose.models.Hangout || mongoose.model("Hangout", HangoutSchema)
