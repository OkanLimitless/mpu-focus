import mongoose, { Schema } from 'mongoose'

interface UserCaseProfileDoc extends mongoose.Document {
  userId: Schema.Types.ObjectId
  sourceHash: string
  facts: any
  riskFlags: string[]
  createdAt: Date
  updatedAt: Date
}

const UserCaseProfileSchema = new Schema<UserCaseProfileDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  sourceHash: { type: String, index: true, required: true },
  facts: { type: Schema.Types.Mixed, required: true },
  riskFlags: { type: [String], default: [] },
}, { timestamps: true })

export default mongoose.models.UserCaseProfile || mongoose.model<UserCaseProfileDoc>('UserCaseProfile', UserCaseProfileSchema)

