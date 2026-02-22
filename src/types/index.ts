// Basic types for the application (non-library dependent)

export interface User {
    id: string
    _id: string // Legacy support
    email: string
    firstName: string
    lastName: string
    role: 'user' | 'admin'
    isActive: boolean
    verificationStatus: verificationStatus
    passportDocument?: {
        filename: string
        url?: string
        uploadedAt: Date
        status: 'pending' | 'approved' | 'rejected'
        rejectionReason?: string
    }
    contractSigned?: {
        signedAt: Date
        ipAddress: string
        userAgent: string
        signatureData?: string
        signatureMethod?: signatureMethod
    }
    verifiedAt?: Date
    createdAt: Date
    updatedAt: Date
}

export interface Course {
    id: string
    _id: string
    title: string
    description: string
    isActive: boolean
}

export type ModuleKey =
    | 'alcohol_drugs'
    | 'traffic_points'
    | 'medicinal_cannabis'
    | 'extras'

export interface Chapter {
    id: string
    _id: string
    courseId: string
    moduleKey: ModuleKey
    title: string
    description: string
    order: number
    isActive: boolean
}

export interface Video {
    id: string
    _id: string
    chapterId: string
    title: string
    description: string
    muxAssetId?: string
    muxPlaybackId?: string
    duration: number
    order: number
    isActive: boolean
}

export interface Lead {
    id: string
    _id: string // Legacy support
    firstName: string
    lastName: string
    email: string
    phone: string
    timeframe: string
    reason: string
    jobLoss: boolean
    mpuChallenges: string[]
    concerns: string[]
    availability: string[]
    status: 'new' | 'contacted' | 'converted' | 'closed'
    notes?: string
    convertedToUserId?: string
    convertedAt?: Date | string
    createdAt: Date | string
    updatedAt: Date | string
}

export interface DashboardStats {
    totalUsers: number
    activeUsers: number
    totalCourses: number
    totalDocuments: number
    pendingDocuments: number
    completionRate: number
}

export type verificationStatus = 'pending' | 'documents_uploaded' | 'contract_signed' | 'verified' | 'rejected' | 'resubmission_required'

export type signatureMethod = 'checkbox' | 'digital_signature' | 'qes'
