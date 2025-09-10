import mongoose, { Schema } from 'mongoose'

export type QuizQuestionType = 'mcq' | 'short' | 'scenario'

interface QuizQuestionDoc extends mongoose.Document {
  userId: Schema.Types.ObjectId
  blueprintId: Schema.Types.ObjectId
  type: QuizQuestionType
  category: string
  difficulty: number
  prompt: string
  choices?: Array<{ key: string; text: string }>
  correct?: string | string[]
  rationales?: any
  rubric?: any
  createdAt: Date
  updatedAt: Date
}

const QuizQuestionSchema = new Schema<QuizQuestionDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  blueprintId: { type: Schema.Types.ObjectId, ref: 'QuizBlueprint', index: true, required: true },
  type: { type: String, enum: ['mcq','short','scenario'], required: true },
  category: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 3, default: 1 },
  prompt: { type: String, required: true },
  choices: [{ key: String, text: String }],
  correct: Schema.Types.Mixed,
  rationales: Schema.Types.Mixed,
  rubric: Schema.Types.Mixed,
}, { timestamps: true })

export default mongoose.models.QuizQuestion || mongoose.model<QuizQuestionDoc>('QuizQuestion', QuizQuestionSchema)

