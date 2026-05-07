import mongoose from "mongoose"

const OtpSchema = new mongoose.Schema(
  {
    phone: { type: String, index: true },
    email: { type: String, index: true },
    channel: { type: String, enum: ["sms", "email"], required: true },
    ip: { type: String },
    code: { type: String, required: true },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema)
