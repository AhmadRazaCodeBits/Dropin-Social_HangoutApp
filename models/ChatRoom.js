import mongoose from "mongoose"

const ChatRoomSchema = new mongoose.Schema(
  {
    signalId: { type: mongoose.Schema.Types.ObjectId, ref: "Signal" },
    roomType: { type: String, enum: ["dm", "group"], default: "dm" },
    name: { type: String, default: "" },
    inviteCode: { type: String, sparse: true, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

export default mongoose.models.ChatRoom || mongoose.model("ChatRoom", ChatRoomSchema)
