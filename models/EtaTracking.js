import mongoose from "mongoose"

const EtaTrackingSchema = new mongoose.Schema(
  {
    hangoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Hangout" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    currentLat: Number,
    currentLng: Number,
    etaMinutes: Number,
    travelMode: { type: String, enum: ["walking", "driving", "transit"], default: "walking" },
    arrived: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

EtaTrackingSchema.index({ hangoutId: 1, userId: 1 }, { unique: true })

export default mongoose.models.EtaTracking || mongoose.model("EtaTracking", EtaTrackingSchema)
