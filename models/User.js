import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    displayName: String,
    avatarUrl: String,
    phone: { type: String, unique: true, sparse: true },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
      isAdmin: { type: Boolean, default: false },
    city: String,
    address: { type: String },
    passwordHash: String,
    role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    publicSuspended: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
    warnCount: { type: Number, default: 0 },
    isIdVerified: { type: Boolean, default: false },
    communityRating: { type: Number, default: 5.0 },
    totalPublicHangouts: { type: Number, default: 0 },
    bio: { type: String, maxLength: 140 },
    gender: String,
    age: Number,
    preferences: {
      gender: [String],
      ageRange: { min: Number, max: Number }
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model("User", UserSchema)
