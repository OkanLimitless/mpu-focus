import mongoose, { Schema } from 'mongoose'

export interface ChapterProgress {
  _id: string
  userId: mongoose.Types.ObjectId
  chapterId: mongoose.Types.ObjectId
  courseId: mongoose.Types.ObjectId
  isCompleted: boolean
  completedAt?: Date
  totalVideos: number
  completedVideos: number
  progressPercentage: number
}

const ChapterProgressSchema = new Schema<ChapterProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  totalVideos: {
    type: Number,
    default: 0,
  },
  completedVideos: {
    type: Number,
    default: 0,
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
})

// Compound index for efficient querying
ChapterProgressSchema.index({ userId: 1, chapterId: 1 }, { unique: true })
ChapterProgressSchema.index({ userId: 1, courseId: 1 })
ChapterProgressSchema.index({ userId: 1, isCompleted: 1 })

// Update progress percentage when completedVideos or totalVideos change
ChapterProgressSchema.pre('save', function(next) {
  if (this.totalVideos > 0) {
    this.progressPercentage = Math.round((this.completedVideos / this.totalVideos) * 100)
    this.isCompleted = this.progressPercentage >= 100
    if (this.isCompleted && !this.completedAt) {
      this.completedAt = new Date()
    }
  }
  next()
})

export default mongoose.models.ChapterProgress || mongoose.model<ChapterProgress>('ChapterProgress', ChapterProgressSchema)