import mongoose from "mongoose"

const LocationPingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lat: Number,
    lng: Number,
    speedKmh: Number,
    isSuspicious: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.models.LocationPing || mongoose.model("LocationPing", LocationPingSchema)
