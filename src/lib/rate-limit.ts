import { NextRequest } from 'next/server'

// Simple in-memory limiter (non-distributed). Suitable as a stopgap until a shared store (e.g., Upstash Redis) is configured.
// Not suitable for multi-instance accuracy, but provides basic protection.

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // Take the first IP in the list
    const ip = xff.split(',')[0].trim()
    if (ip) return ip
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  // NextRequest.ip may be undefined on some platforms
  // @ts-ignore
  return (request as any).ip || 'unknown'
}

export async function rateLimit(params: { request: NextRequest; limit: number; windowMs: number; keyPrefix?: string }) {
  const { request, limit, windowMs, keyPrefix = 'rl' } = params
  const ip = getClientIp(request)
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  let bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    store.set(key, bucket)
  }

  bucket.count += 1

  const ok = bucket.count <= limit

  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  }
}