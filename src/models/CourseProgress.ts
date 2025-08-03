import mongoose, { Schema } from 'mongoose'
import type { CourseProgress } from '@/types'

const CourseProgressSchema = new Schema<CourseProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  watchedDuration: {
    type: Number,
    default: 0,
  },
  totalDuration: {
    type: Number,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
})

// Compound index for efficient querying
CourseProgressSchema.index({ userId: 1, courseId: 1, chapterId: 1, videoId: 1 }, { unique: true })
CourseProgressSchema.index({ userId: 1, courseId: 1 })
CourseProgressSchema.index({ userId: 1, isCompleted: 1 })

// Pre-save middleware to set completedAt when isCompleted becomes true
CourseProgressSchema.pre('save', function(next) {
  if (this.isModified('isCompleted') && this.isCompleted && !this.completedAt) {
    this.completedAt = new Date()
  }
  next()
})

export default mongoose.models.CourseProgress || mongoose.model<CourseProgress>('CourseProgress', CourseProgressSchema)