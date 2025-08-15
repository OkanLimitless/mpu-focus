import mongoose, { Schema } from 'mongoose'
import type { Chapter } from '@/types'

const MODULE_KEYS = [
  'alcohol_drugs',
  'traffic_points',
  'medicinal_cannabis',
  'extras',
] as const

const ChapterSchema = new Schema<Chapter>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  moduleKey: {
    type: String,
    enum: MODULE_KEYS as any,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Index for efficient querying
ChapterSchema.index({ courseId: 1, order: 1 })
ChapterSchema.index({ moduleKey: 1, order: 1 })

export default mongoose.models.Chapter || mongoose.model<Chapter>('Chapter', ChapterSchema)