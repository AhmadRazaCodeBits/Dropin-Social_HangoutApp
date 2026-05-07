import mongoose from "mongoose"

const SignalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vibe: {
      type: String,
      enum: ["chill", "chai", "coffee", "burger", "pizza", "food", "dessert", "walk", "drinks", "anything"],
      required: true,
    },
    windowMinutes: { type: Number, required: true },
    radiusKm: { type: Number, required: true },
    isGhost: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    publicBio: String,
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "matched", "expired"],
      default: "active",
    },
  },
  { timestamps: true }
)

SignalSchema.index({ location: "2dsphere" })
SignalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Signal || mongoose.model("Signal", SignalSchema)
