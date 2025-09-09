import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { User } from '@/types'

const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Document verification fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'documents_uploaded', 'contract_signed', 'verified', 'rejected', 'resubmission_required'],
    default: 'pending',
  },
  passportDocument: {
    filename: { type: String },
    url: { type: String }, // Add URL for document access
    uploadedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: { type: String },
    resubmissionCount: { type: Number, default: 0 }, // Track how many times documents were resubmitted
    allowResubmission: { type: Boolean, default: false } // Whether user can resubmit documents
  },
  contractSigned: {
    signedAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String },
    signatureData: { type: String }, // Base64 encoded signature image
    signatureMethod: { 
      type: String, 
      enum: ['digital_signature', 'checkbox', 'qes'], 
      default: 'checkbox' 
    }
  },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationToken: { type: String },
  // Document processing results from MPU documents
  documentProcessing: {
    extractedData: { type: String }, // The extracted text data from GPT analysis
    fileName: { type: String }, // Original filename of processed document
    totalPages: { type: Number }, // Number of pages processed
    processedAt: { type: Date }, // When the document was processed
    processingMethod: { type: String }, // Method used for processing (e.g., "GPT-5 Mini")
    processingNotes: { type: String }, // Additional processing metadata
    pdfUrl: { type: String } // Cached URL to generated PDF (when available)
  },
  // Admin notes for this user
  adminNotes: [{
    note: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false } // Whether note is visible to user
  }],
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).password
      delete (ret as any).verificationToken
      return ret
    }
  }
})

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

export default mongoose.models.User || mongoose.model<User>('User', UserSchema)
