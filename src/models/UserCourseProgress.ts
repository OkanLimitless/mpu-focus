import mongoose, { Schema } from 'mongoose'

export interface UserCourseProgress {
  _id: string
  userId: mongoose.Types.ObjectId
  courseId: mongoose.Types.ObjectId
  currentChapterOrder: number
  completedChapters: number[]
  lastAccessedAt: Date
}

const UserCourseProgressSchema = new Schema<UserCourseProgress>({
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
  currentChapterOrder: {
    type: Number,
    default: 1, // Start with first chapter
    min: 1,
  },
  completedChapters: [{
    type: Number,
  }],
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Compound unique index
UserCourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true })

export default mongoose.models.UserCourseProgress || mongoose.model<UserCourseProgress>('UserCourseProgress', UserCourseProgressSchema)