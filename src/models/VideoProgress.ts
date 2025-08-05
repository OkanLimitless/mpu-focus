import mongoose, { Schema, Document } from 'mongoose'

interface VideoProgress extends Document {
  _id: string
  userId: mongoose.Types.ObjectId | string
  videoId: mongoose.Types.ObjectId | string
  chapterId: mongoose.Types.ObjectId | string
  courseId: mongoose.Types.ObjectId | string
  watchedDuration: number
  totalDuration: number
  currentTime: number
  isCompleted: boolean
  completedAt?: Date
  lastWatchedAt: Date
  createdAt: Date
  updatedAt: Date
}

const VideoProgressSchema = new Schema<VideoProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
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
  watchedDuration: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalDuration: {
    type: Number,
    required: true,
    min: 0,
  },
  currentTime: {
    type: Number,
    default: 0,
    min: 0,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Indexes for efficient querying
VideoProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true })
VideoProgressSchema.index({ userId: 1, courseId: 1 })
VideoProgressSchema.index({ userId: 1, chapterId: 1 })
VideoProgressSchema.index({ isCompleted: 1 })

// Virtual for completion percentage
VideoProgressSchema.virtual('completionPercentage').get(function() {
  if (this.totalDuration === 0) return 0
  return Math.min(100, Math.round((this.watchedDuration / this.totalDuration) * 100))
})

// Auto-mark as completed when watch duration reaches 90% of total duration
VideoProgressSchema.pre('save', function(next) {
  if (!this.isCompleted && this.totalDuration > 0) {
    const completionThreshold = this.totalDuration * 0.9
    if (this.watchedDuration >= completionThreshold) {
      this.isCompleted = true
      this.completedAt = new Date()
    }
  }
  next()
})

export default mongoose.models.VideoProgress || mongoose.model<VideoProgress>('VideoProgress', VideoProgressSchema)