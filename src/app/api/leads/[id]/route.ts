import { NextRequest, NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { supabaseRest } from '@/lib/supabase-rest'

type SignupRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  goals: string | null
  status: 'new' | 'contacted' | 'enrolled' | 'closed'
  notes: string | null
  source: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  last_contacted_at: string | null
}

function mapLead(row: SignupRow) {
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
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    assertAdminRequest(request)

    const { data } = await supabaseRest<SignupRow[]>({
      path: 'mpu_signups',
      query: {
        select: '*',
        id: `eq.${params.id}`,
        limit: 1,
      },
      useServiceRole: true,
    })

    const lead = data?.[0]
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead: mapLead(lead) })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    assertAdminRequest(request)

    const body = await request.json()
    const status = body?.status ? String(body.status) : undefined
    const notes = body?.notes !== undefined ? String(body.notes || '') : undefined

    const patch: Record<string, string | null> = {}
    if (status) patch.status = status
    if (notes !== undefined) patch.notes = notes
    if (status === 'contacted') patch.last_contacted_at = new Date().toISOString()

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data } = await supabaseRest<SignupRow[]>({
      path: 'mpu_signups',
      method: 'PATCH',
      query: {
        id: `eq.${params.id}`,
        select: '*',
      },
      body: patch,
      useServiceRole: true,
      prefer: 'return=representation',
    })

    const updated = data?.[0]
    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      lead: mapLead(updated),
    })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Lead conversion is not part of the new CRM flow' },
    { status: 400 },
  )
}
