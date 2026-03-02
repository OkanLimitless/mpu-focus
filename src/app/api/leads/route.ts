import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+0-9 ()/-]{7,}$/

function createSupabaseAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase admin credentials missing')
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    })
}

function toOptionalString(value: unknown, maxLen = 500): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim()
    if (!normalized) return null
    return normalized.slice(0, maxLen)
}

function toStringArray(value: unknown, maxItems = 8, maxLen = 120): string[] {
    if (!Array.isArray(value)) return []
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, maxItems)
        .map((item) => item.slice(0, maxLen))
}

function getHttpStatus(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('unauthorized')) return 401
    if (message.includes('forbidden')) return 403
    return 500
}

export async function GET(request: NextRequest) {
    try {
        await assertAdminRequest()

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
        const status = searchParams.get('status')
        const search = searchParams.get('search')

        const offset = (page - 1) * limit

        const supabaseAdmin = createSupabaseAdmin()

        let query = supabaseAdmin
            .from('leads')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
        }

        const { data: leads, count, error } = await query.range(offset, offset + limit - 1)

        if (error) {
            console.error("Supabase Error:", error)
            throw error
        }

        // Map database fields to application fields
        const formattedLeads = leads?.map(lead => ({
            _id: lead.id,
            firstName: lead.first_name,
            lastName: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            status: lead.status || 'new',
            goals: lead.goals || '',
            notes: lead.notes || '',
            createdAt: lead.created_at,
            convertedToUserId: lead.converted_to_user_id
        })) || []

        return NextResponse.json({
            leads: formattedLeads,
            pagination: {
                total: count || 0,
                page,
                limit,
                pages: Math.ceil((count || 0) / limit)
            }
        })
    } catch (error: any) {
        console.error('Error fetching leads:', error)
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: getHttpStatus(error) })
    }
}

export async function POST(request: NextRequest) {
    try {
        const rl = await rateLimit({
            request,
            limit: 8,
            windowMs: 15 * 60 * 1000,
            keyPrefix: 'lead-submit',
        })

        if (!rl.ok) {
            return NextResponse.json(
                { error: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
            )
        }

        const body = await request.json()

        const firstName = toOptionalString(body.firstName, 80)
        const lastName = toOptionalString(body.lastName, 80)
        const emailRaw = toOptionalString(body.email, 200)
        const phone = toOptionalString(body.phone, 40)
        const goals = toOptionalString(body.goals, 2000)
        const source = toOptionalString(body.source, 120)
        const hasConsentField = Object.prototype.hasOwnProperty.call(body ?? {}, 'consentAccepted')
        const consentAccepted = body?.consentAccepted === true

        if (!firstName || !lastName || !emailRaw || !phone) {
            return NextResponse.json({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' }, { status: 400 })
        }

        const email = emailRaw.toLowerCase()
        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }, { status: 400 })
        }

        if (!PHONE_REGEX.test(phone)) {
            return NextResponse.json({ error: 'Bitte geben Sie eine gültige Telefonnummer ein.' }, { status: 400 })
        }

        if (hasConsentField && !consentAccepted) {
            return NextResponse.json({ error: 'Bitte stimmen Sie der Datenschutzerklärung zu.' }, { status: 400 })
        }

        const timeframe = toOptionalString(body.timeframe, 120)
        const reason = toOptionalString(body.reason, 120)
        const jobLoss = typeof body.jobLoss === 'boolean' ? body.jobLoss : null
        const mpuChallenges = toStringArray(body.mpuChallenges)
        const concerns = toStringArray(body.concerns)
        const availability = toStringArray(body.availability)
        const consentVersion = toOptionalString(body.consentVersion, 60)

        const contextLines: string[] = [
            `Einwilligung: ${consentAccepted ? 'explizit erteilt' : 'implizit (Legacy-Formular)'} (${new Date().toISOString()})`,
            consentVersion ? `Einwilligungs-Version: ${consentVersion}` : '',
            source ? `Quelle: ${source}` : '',
            timeframe ? `Zeithorizont: ${timeframe}` : '',
            reason ? `MPU-Grund: ${reason}` : '',
            jobLoss === null ? '' : `Jobverlust durch Entzug: ${jobLoss ? 'Ja' : 'Nein'}`,
            mpuChallenges.length ? `MPU-Herausforderungen: ${mpuChallenges.join(', ')}` : '',
            concerns.length ? `Huerden/Aengste: ${concerns.join(', ')}` : '',
            availability.length ? `Erreichbarkeit: ${availability.join(', ')}` : '',
        ].filter(Boolean)

        const notes = contextLines.length ? contextLines.join('\n').slice(0, 4000) : null

        const supabaseAdmin = createSupabaseAdmin()

        const { data, error } = await supabaseAdmin
            .from('leads')
            .insert({
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                goals,
                notes,
            })
            .select('id')
            .single()

        if (error) {
            console.error('Supabase Insert Error:', error)
            throw error
        }

        return NextResponse.json({ success: true, leadId: data.id }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating lead:', error)
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }
}
