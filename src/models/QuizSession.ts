import mongoose, { Schema } from 'mongoose'

interface QuizSessionDoc extends mongoose.Document {
  userId: Schema.Types.ObjectId
  questionIds: Schema.Types.ObjectId[]
  score?: number
  startedAt: Date
  finishedAt?: Date
  durationSeconds?: number
  competencyScores?: any
  createdAt: Date
  updatedAt: Date
}

const QuizSessionSchema = new Schema<QuizSessionDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  questionIds: [{ type: Schema.Types.ObjectId, ref: 'QuizQuestion', required: true }],
  score: Number,
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  durationSeconds: Number,
  competencyScores: Schema.Types.Mixed,
}, { timestamps: true })

export default mongoose.models.QuizSession || mongoose.model<QuizSessionDoc>('QuizSession', QuizSessionSchema)

