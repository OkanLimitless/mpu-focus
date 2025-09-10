import mongoose, { Schema } from 'mongoose'

interface UserIntakeDoc extends mongoose.Document {
  userId: Schema.Types.ObjectId
  responses: any
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserIntakeSchema = new Schema<UserIntakeDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true, unique: true },
  responses: { type: Schema.Types.Mixed, default: {} },
  completedAt: { type: Date },
}, { timestamps: true })

export default mongoose.models.UserIntake || mongoose.model<UserIntakeDoc>('UserIntake', UserIntakeSchema)

