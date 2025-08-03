import { Document, Types } from 'mongoose'

export interface User extends Document {
  _id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  isActive: boolean
  courseProgress: CourseProgress[]
  documents: UserDocument[]
  createdAt: Date
  updatedAt: Date
}

export interface Course extends Document {
  _id: string
  title: string
  description: string
  chapters: Chapter[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Chapter extends Document {
  _id: string
  courseId: Types.ObjectId | string
  title: string
  description: string
  order: number
  videos: Video[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Video extends Document {
  _id: string
  chapterId: Types.ObjectId | string
  title: string
  description: string
  muxAssetId?: string
  muxPlaybackId?: string
  duration: number
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CourseProgress extends Document {
  _id: string
  userId: Types.ObjectId | string
  courseId: Types.ObjectId | string
  chapterId: Types.ObjectId | string
  videoId: Types.ObjectId | string
  watchedDuration: number
  totalDuration: number
  isCompleted: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserDocument extends Document {
  _id: string
  userId: Types.ObjectId | string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  uploadUrl: string
  status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  reviewedBy?: Types.ObjectId | string
  reviewedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCourses: number
  totalDocuments: number
  pendingDocuments: number
  completionRate: number
}

export interface UserProgress {
  totalChapters: number
  completedChapters: number
  totalVideos: number
  completedVideos: number
  overallProgress: number
  currentChapter?: Chapter
  nextVideo?: Video
}