import mongoose from "mongoose"

const FeatureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    metadata: {},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

export default mongoose.models.Feature || mongoose.model("Feature", FeatureSchema)
