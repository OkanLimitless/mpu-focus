import { createSupabaseAdminClient } from './video-library'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'paypal' | 'other'

export type PaymentRecord = {
  id: string
  profileId: string
  amountCents: number
  method: PaymentMethod
  note: string | null
  paidAt: string
  recordedBy: string | null
  createdAt: string | null
}

export type FinanceClient = {
  profileId: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  packagePriceCents: number | null
  financeNotes: string | null
  paidCents: number
  outstandingCents: number
  paymentsCount: number
  lastPaymentAt: string | null
}

function toPaymentRecord(row: any): PaymentRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    amountCents: Number(row.amount_cents ?? 0),
    method: (['cash', 'bank_transfer', 'paypal', 'other'].includes(row.method) ? row.method : 'other') as PaymentMethod,
    note: row.note ?? null,
    paidAt: row.paid_at,
    recordedBy: row.recorded_by ?? null,
    createdAt: row.created_at ?? null,
  }
}

export async function getFinanceOverview() {
  const supabaseAdmin = createSupabaseAdminClient()

  const [profilesResult, paymentsResult] = await Promise.all([
    supabaseAdmin
      .from('mpu_profiles')
      .select('id,first_name,last_name,email,is_active,role,package_price_cents,finance_notes')
      .eq('role', 'student')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('mpu_payments')
      .select('*, profile:mpu_profiles!mpu_payments_profile_id_fkey(id,first_name,last_name,email)')
      .order('paid_at', { ascending: false }),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (paymentsResult.error) throw paymentsResult.error

  const payments = paymentsResult.data || []
  const paidByProfile = new Map<string, { paidCents: number; count: number; lastPaymentAt: string | null }>()

  for (const payment of payments) {
    const entry = paidByProfile.get(payment.profile_id) || { paidCents: 0, count: 0, lastPaymentAt: null }
    entry.paidCents += Number(payment.amount_cents ?? 0)
    entry.count += 1
    if (!entry.lastPaymentAt || new Date(payment.paid_at) > new Date(entry.lastPaymentAt)) {
      entry.lastPaymentAt = payment.paid_at
    }
    paidByProfile.set(payment.profile_id, entry)
  }

  const clients: FinanceClient[] = (profilesResult.data || []).map((profile: any) => {
    const paid = paidByProfile.get(profile.id) || { paidCents: 0, count: 0, lastPaymentAt: null }
    const packagePriceCents = profile.package_price_cents ?? null
    return {
      profileId: profile.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      email: profile.email || '',
      isActive: profile.is_active === true,
      packagePriceCents,
      financeNotes: profile.finance_notes ?? null,
      paidCents: paid.paidCents,
      outstandingCents: packagePriceCents != null ? Math.max(0, packagePriceCents - paid.paidCents) : 0,
      paymentsCount: paid.count,
      lastPaymentAt: paid.lastPaymentAt,
    }
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalCollectedCents = payments.reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0)
  const collectedThisMonthCents = payments
    .filter((p) => new Date(p.paid_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0)
  const outstandingCents = clients.reduce((sum, client) => sum + client.outstandingCents, 0)

  const recentPayments = payments.slice(0, 25).map((row: any) => ({
    ...toPaymentRecord(row),
    profileName: [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ') || 'Unbekannt',
    profileEmail: row.profile?.email || '',
  }))

  return {
    summary: {
      totalCollectedCents,
      collectedThisMonthCents,
      outstandingCents,
      clientsWithBalance: clients.filter((client) => client.outstandingCents > 0).length,
    },
    clients,
    recentPayments,
  }
}

export async function createPayment(input: {
  profileId: string
  amountCents: number
  method: PaymentMethod
  note?: string | null
  paidAt?: string | null
  recordedBy?: string | null
}): Promise<PaymentRecord> {
  if (!input.profileId) throw new Error('Teilnehmer ist erforderlich.')
  const amountCents = Math.round(Number(input.amountCents))
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error('Betrag muss größer als 0 sein.')
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_payments')
    .insert({
      profile_id: input.profileId,
      amount_cents: amountCents,
      method: input.method || 'cash',
      note: input.note ?? null,
      paid_at: input.paidAt || new Date().toISOString(),
      recorded_by: input.recordedBy ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return toPaymentRecord(data)
}

export async function deletePayment(id: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_payments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function listPaymentsForProfile(profileId: string): Promise<PaymentRecord[]> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_payments')
    .select('*')
    .eq('profile_id', profileId)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toPaymentRecord)
}

export async function updateClientFinance(profileId: string, patch: {
  packagePriceCents?: number | null
  financeNotes?: string | null
}) {
  const payload: Record<string, any> = {}
  if (patch.packagePriceCents !== undefined) {
    payload.package_price_cents = patch.packagePriceCents == null
      ? null
      : Math.max(0, Math.round(Number(patch.packagePriceCents)))
  }
  if (patch.financeNotes !== undefined) payload.finance_notes = patch.financeNotes ?? null

  if (Object.keys(payload).length === 0) throw new Error('Keine Änderungen angegeben.')

  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_profiles')
    .update(payload)
    .eq('id', profileId)

  if (error) throw error
}
