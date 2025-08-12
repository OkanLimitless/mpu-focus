import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export async function POST(
  req: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  // Limit login attempts: 5 per minute per IP
  const limited = await rateLimit({ request: req, limit: 5, windowMs: 60 * 1000, keyPrefix: 'login' })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return (handler as any)(req, context)
}

export async function GET(
  req: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  return (handler as any)(req, context)
}