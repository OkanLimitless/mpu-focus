import mongoose, { Schema } from 'mongoose'
import type { Video } from '@/types'

const VideoSchema = new Schema<Video>({
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
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
  muxAssetId: {
    type: String,
  },
  muxPlaybackId: {
    type: String,
  },
  duration: {
    type: Number,
    default: 0,
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
  status: {
    type: String,
    enum: ['preparing', 'ready', 'errored', 'deleted'],
    default: 'preparing',
  },
}, {
  timestamps: true,
})

// Index for efficient querying
VideoSchema.index({ chapterId: 1, order: 1 })
VideoSchema.index({ muxAssetId: 1 })

export default mongoose.models.Video || mongoose.model<Video>('Video', VideoSchema)