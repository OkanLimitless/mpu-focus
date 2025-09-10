import mongoose, { Schema } from 'mongoose'

interface QuizBlueprintDoc extends mongoose.Document {
  userId: Schema.Types.ObjectId
  sourceHash: string
  categories: Array<{ key: string; count: number }>
  llmMeta?: { model?: string; promptId?: string }
  createdAt: Date
  updatedAt: Date
}

const QuizBlueprintSchema = new Schema<QuizBlueprintDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  sourceHash: { type: String, index: true, required: true },
  categories: [{ key: { type: String, required: true }, count: { type: Number, required: true } }],
  llmMeta: { type: Schema.Types.Mixed },
}, { timestamps: true })

export default mongoose.models.QuizBlueprint || mongoose.model<QuizBlueprintDoc>('QuizBlueprint', QuizBlueprintSchema)

