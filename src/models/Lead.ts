import mongoose, { Schema } from 'mongoose'
import type { Lead } from '@/types'

const LeadSchema = new Schema<Lead>({
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
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  // Quiz responses
  timeframe: {
    type: String,
    required: true,
    enum: ['Innerhalb von 3 Monaten', '3-6 Monate', '6-12 Monate', 'Über 1 Jahr'],
  },
  reason: {
    type: String,
    required: true,
    enum: ['Alkohol', 'Drogen', 'Punkte', 'Straftat', 'Andere'],
  },
  jobLoss: {
    type: Boolean,
    required: true,
  },
  mpuChallenges: [{
    type: String,
    enum: [
      'Mangelnde Vorbereitung',
      'Unzureichende Beratung',
      'Stress und Nervosität',
      'Fehlende Struktur',
      'Unrealistische Erwartungen',
      'Andere'
    ]
  }],
  concerns: [{
    type: String,
    enum: [
      'Angst vor dem Gespräch',
      'Unsicherheit bei der Vorbereitung', 
      'Zeitliche Belastung',
      'Finanzielle Sorgen',
      'Unklarheit über den Ablauf',
      'Andere'
    ]
  }],
  availability: [{
    type: String,
    enum: [
      'Vormittag (8-12 Uhr)',
      'Mittag (12-16 Uhr)', 
      'Nachmittag (16-20 Uhr)',
      'Abend (nach 20 Uhr)'
    ]
  }],
  // Status and tracking
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new',
  },
  contactedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  contactedAt: {
    type: Date,
    required: false,
  },
  convertedToUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  convertedAt: {
    type: Date,
    required: false,
  },
  notes: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
})

// Virtual for full name
LeadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Index for efficient queries
LeadSchema.index({ status: 1 })
LeadSchema.index({ createdAt: -1 })
LeadSchema.index({ email: 1 })

export default mongoose.models.Lead || mongoose.model<Lead>('Lead', LeadSchema)