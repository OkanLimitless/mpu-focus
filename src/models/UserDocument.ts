import mongoose, { Schema } from 'mongoose'
import type { UserDocument } from '@/types'

const UserDocumentSchema = new Schema<UserDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return v === 'application/pdf'
      },
      message: 'Only PDF files are allowed'
    }
  },
  uploadUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
})

// Index for efficient querying
UserDocumentSchema.index({ userId: 1, status: 1 })
UserDocumentSchema.index({ status: 1, createdAt: -1 })
UserDocumentSchema.index({ reviewedBy: 1 })

// Pre-save middleware to set reviewedAt when status changes from pending
UserDocumentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date()
  }
  next()
})

export default mongoose.models.UserDocument || mongoose.model<UserDocument>('UserDocument', UserDocumentSchema)