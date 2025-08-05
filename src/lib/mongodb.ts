import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI && process.env.NODE_ENV !== 'production') {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

// TypeScript assertion to ensure cached is never undefined after initialization
const mongooseCache = cached as MongooseCache

async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  if (mongooseCache.conn) {
    return mongooseCache.conn
  }

  if (!mongooseCache.promise) {
    const opts = {
      bufferCommands: false,
    }

    mongooseCache.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    mongooseCache.conn = await mongooseCache.promise
  } catch (e) {
    mongooseCache.promise = null
    throw e
  }

  return mongooseCache.conn
}

export default connectDB