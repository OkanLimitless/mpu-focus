// Import all models to ensure they're registered
import User from '@/models/User'
import Course from '@/models/Course'
import Chapter from '@/models/Chapter'
import Video from '@/models/Video'
import CourseProgress from '@/models/CourseProgress'
import UserDocument from '@/models/UserDocument'
import UserRequest from '@/models/UserRequest'
import VideoProgress from '@/models/VideoProgress'

// Export all models for easy access
export {
  User,
  Course,
  Chapter,
  Video,
  CourseProgress,
  UserDocument,
  UserRequest,
  VideoProgress
}

// Ensure all models are registered function
export const ensureModelsRegistered = () => {
  // Just importing them above ensures they're registered
  // This function can be called to make sure all models are loaded
  return {
    User,
    Course,
    Chapter,
    Video,
    CourseProgress,
    UserDocument,
    UserRequest,
    VideoProgress
  }
}