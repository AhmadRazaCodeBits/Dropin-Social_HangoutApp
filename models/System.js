import mongoose from 'mongoose'

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, enum: ['harassment', 'fake_location', 'fake_profile', 'spam', 'other'] },
  description: String,
  source: { type: String, enum: ['user_report', 'velocity_check', 'rating_floor', 'auto_flag'] },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
}, { timestamps: true })

const AiLogSchema = new mongoose.Schema({
  callType: { type: String, enum: ['spot_picker', 'memory_card', 'general'] },
  provider: String,
  prompt: String,
  response: String,
  tokensUsed: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  error: String,
  hangoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
}, { timestamps: true })

const RatingSchema = new mongoose.Schema({
  hangoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number, min: 1, max: 5 },
  comment: String,
}, { timestamps: true })

const EtaTrackingSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentLat: Number,
  currentLng: Number,
  etaMinutes: Number,
  travelMode: { type: String, default: 'walking' },
  arrived: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true })

export const AppSettings = mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema)
export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema)
export const AiLog = mongoose.models.AiLog || mongoose.model('AiLog', AiLogSchema)
export const Rating = mongoose.models.Rating || mongoose.model('Rating', RatingSchema)
export const EtaTracking = mongoose.models.EtaTracking || mongoose.model('EtaTracking', EtaTrackingSchema)
