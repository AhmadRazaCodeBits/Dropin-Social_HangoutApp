import mongoose from "mongoose"

const BlockSchema = new mongoose.Schema(
  {
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true })

export default mongoose.models.Block || mongoose.model("Block", BlockSchema)
