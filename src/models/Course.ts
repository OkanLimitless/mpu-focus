import mongoose, { Schema } from 'mongoose'
import type { Course } from '@/types'

const CourseSchema = new Schema<Course>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

export default mongoose.models.Course || mongoose.model<Course>('Course', CourseSchema)