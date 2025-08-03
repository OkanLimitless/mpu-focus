import mongoose, { Schema } from 'mongoose'
import type { Chapter } from '@/types'

const ChapterSchema = new Schema<Chapter>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
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

export default mongoose.models.Chapter || mongoose.model<Chapter>('Chapter', ChapterSchema)