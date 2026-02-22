import { NextRequest, NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { supabaseCount, supabaseRest } from '@/lib/supabase-rest'

type SignupRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  goals: string | null
  status: 'new' | 'contacted' | 'enrolled' | 'closed'
  notes: string | null
  created_at: string
  updated_at: string
  source: string | null
  tags: string[] | null
}

function formatLead(row: SignupRow) {
  return {
    _id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    goals: row.goals,
    status: row.status,
    notes: row.notes,
    source: row.source,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildGoals(body: any): string {
  const parts: string[] = []
  if (body?.goals) parts.push(String(body.goals))
  if (body?.timeframe) parts.push(`Timeframe: ${body.timeframe}`)
  if (body?.reason) parts.push(`Reason: ${body.reason}`)
  if (Array.isArray(body?.concerns) && body.concerns.length) {
    parts.push(`Concerns: ${body.concerns.join(', ')}`)
  }
  if (Array.isArray(body?.mpuChallenges) && body.mpuChallenges.length) {
    parts.push(`Challenges: ${body.mpuChallenges.join(', ')}`)
  }
  if (Array.isArray(body?.availability) && body.availability.length) {
    parts.push(`Availability: ${body.availability.join(', ')}`)
  }
  if (typeof body?.jobLoss === 'boolean') {
    parts.push(`Job loss: ${body.jobLoss ? 'Yes' : 'No'}`)
  }
  return parts.join('\n').slice(0, 4000)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const firstName = String(body?.firstName || '').trim()
    const lastName = String(body?.lastName || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = String(body?.phone || '').trim()

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: 'firstName, lastName, email and phone are required' }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const { data } = await supabaseRest<SignupRow[]>({
      path: 'mpu_signups',
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        goals: buildGoals(body) || null,
        source: body?.source ? String(body.source) : 'website',
      },
      prefer: 'return=representation',
    })

    return NextResponse.json({
      success: true,
      message: 'Signup created successfully',
      leadId: data?.[0]?.id,
    }, { status: 201 })
  } catch (error: any) {
    const message = String(error?.message || '')
    if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: 'A signup with this email already exists' }, { status: 409 })
    }
    console.error('Error creating signup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))
    const status = String(searchParams.get('status') || 'all')
    const search = String(searchParams.get('search') || '').trim()
    const offset = (page - 1) * limit

    const query: Record<string, string | number> = {
      select: '*',
      order: 'created_at.desc',
      limit,
      offset,
    }

    if (status !== 'all') {
      query.status = `eq.${status}`
    }

    if (search) {
      // PostgREST OR syntax: or=(first_name.ilike.*abc*,email.ilike.*abc*)
      query.or = `(first_name.ilike.*${search}*,last_name.ilike.*${search}*,email.ilike.*${search}*,phone.ilike.*${search}*)`
    }

    const [{ data: rows }, total, newCount, contactedCount, enrolledCount, closedCount] = await Promise.all([
      supabaseRest<SignupRow[]>({
        path: 'mpu_signups',
        query,
        useServiceRole: true,
      }),
      supabaseCount({
        path: 'mpu_signups',
        query: {
          ...(status !== 'all' ? { status: `eq.${status}` } : {}),
          ...(search
            ? { or: `(first_name.ilike.*${search}*,last_name.ilike.*${search}*,email.ilike.*${search}*,phone.ilike.*${search}*)` }
            : {}),
        },
        useServiceRole: true,
      }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.new' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.contacted' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.enrolled' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.closed' }, useServiceRole: true }),
    ])

    return NextResponse.json({
      leads: (rows || []).map(formatLead),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        new: newCount,
        contacted: contactedCount,
        converted: enrolledCount,
        closed: closedCount,
      },
    })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching signups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
