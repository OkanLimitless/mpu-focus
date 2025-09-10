import mongoose, { Schema } from 'mongoose'

interface QuizResultDoc extends mongoose.Document {
  sessionId: Schema.Types.ObjectId
  questionId: Schema.Types.ObjectId
  submitted: any
  isCorrect?: boolean
  score?: number
  timeSpentSec?: number
  feedback?: string
  createdAt: Date
  updatedAt: Date
}

const QuizResultSchema = new Schema<QuizResultDoc>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'QuizSession', index: true, required: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'QuizQuestion', index: true, required: true },
  submitted: Schema.Types.Mixed,
  isCorrect: Boolean,
  score: Number,
  timeSpentSec: Number,
  feedback: String,
}, { timestamps: true })

export default mongoose.models.QuizResult || mongoose.model<QuizResultDoc>('QuizResult', QuizResultSchema)

