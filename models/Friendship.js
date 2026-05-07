import mongoose from "mongoose"

const FriendshipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tier: {
      type: String,
      enum: ["inner_circle", "friends", "acquaintances"],
      default: "friends",
    },
  },
  { timestamps: true }
)

FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true })

export default mongoose.models.Friendship || mongoose.model("Friendship", FriendshipSchema)
