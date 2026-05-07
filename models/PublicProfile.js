import mongoose from "mongoose"

const PublicProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    displayName: String,
    isIdVerified: { type: Boolean, default: false },
    communityRating: { type: Number, default: 5.0 },
    totalPublicHangouts: { type: Number, default: 0 },
    genderIdentity: String,
    ageRange: String,
    showToGenders: [String],
    minPartnerAge: Number,
    maxPartnerAge: Number,
    verifiedOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.models.PublicProfile || mongoose.model("PublicProfile", PublicProfileSchema)
