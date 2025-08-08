import mongoose, { Schema } from 'mongoose'

interface UserProcessedDocument {
  userId: Schema.Types.ObjectId | string
  fileName: string
  totalPages?: number
  extractedData: string
  processingMethod?: string
  processingNotes?: string
}

const UserProcessedDocumentSchema = new Schema<UserProcessedDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  totalPages: {
    type: Number,
  },
  extractedData: {
    type: String,
    required: true,
  },
  processingMethod: {
    type: String,
  },
  processingNotes: {
    type: String,
  },
}, {
  timestamps: true,
})

export default mongoose.models.UserProcessedDocument || mongoose.model('UserProcessedDocument', UserProcessedDocumentSchema)