import { createSupabaseAdminClient } from './video-library'

export type AgreementStatus = 'pending' | 'submitted' | 'approved' | 'rejected'

export type AgreementRecord = {
  id: string
  profileId: string
  status: AgreementStatus
  contractVersion: string
  contractText: string | null
  fullName: string | null
  birthDate: string | null
  address: string | null
  signatureData: string | null
  signedAt: string | null
  signedIp: string | null
  signedUserAgent: string | null
  idDocumentUrl: string | null
  idDocumentName: string | null
  idDocumentUploadedAt: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string | null
}

export type AgreementTemplate = {
  title: string
  text: string
  version: string
}

export const DEFAULT_AGREEMENT_TEMPLATE: AgreementTemplate = {
  title: 'Betreuungsvereinbarung MPU-Vorbereitung',
  version: 'v1',
  text: `Zwischen MPU Focus (nachfolgend "Anbieter") und der unten genannten Person (nachfolgend "Teilnehmer") wird folgende Vereinbarung über die Vorbereitung auf die Medizinisch-Psychologische Untersuchung (MPU) geschlossen:

1. Leistungen
Der Anbieter stellt dem Teilnehmer Zugang zur Online-Akademie (Videokurse, Wissenstests) bereit und begleitet die Vorbereitung durch persönliche Beratungsgespräche. Der Umfang richtet sich nach dem individuell vereinbarten Paket.

2. Mitwirkung des Teilnehmers
Eine erfolgreiche Vorbereitung setzt die aktive Mitarbeit des Teilnehmers voraus (Bearbeitung der Lektionen, Wahrnehmung der Termine, wahrheitsgemäße Angaben). Der Anbieter schuldet die sorgfältige Vorbereitung, nicht das Bestehen der MPU.

3. Vergütung
Die Vergütung richtet sich nach dem vereinbarten Paketpreis. Gezahlte Beträge werden quittiert. Bereits erbrachte Leistungen sind bei vorzeitiger Beendigung anteilig zu vergüten.

4. Widerrufsrecht
Dem Teilnehmer steht ein 14-tägiges Widerrufsrecht zu. Der Teilnehmer stimmt ausdrücklich zu, dass der Anbieter vor Ablauf der Widerrufsfrist mit der Leistung beginnt. Bei vollständiger Erbringung der Leistung erlischt das Widerrufsrecht; bei vorzeitigem Widerruf ist Wertersatz für bereits erbrachte Leistungen zu zahlen.

5. Vertraulichkeit & Datenschutz
Alle Angaben des Teilnehmers werden vertraulich behandelt und ausschließlich zur Durchführung der Vorbereitung verwendet. Es gilt die Datenschutzerklärung des Anbieters.

6. Identitätsnachweis
Zur Bestätigung der Identität lädt der Teilnehmer eine Kopie seines Ausweisdokuments hoch. Diese wird ausschließlich zur Vertragsabwicklung gespeichert.

Mit der elektronischen Unterschrift bestätigt der Teilnehmer, diese Vereinbarung gelesen und verstanden zu haben und ihr zuzustimmen.`,
}

function toAgreementRecord(row: any): AgreementRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    status: (['pending', 'submitted', 'approved', 'rejected'].includes(row.status) ? row.status : 'pending') as AgreementStatus,
    contractVersion: row.contract_version || 'v1',
    contractText: row.contract_text ?? null,
    fullName: row.full_name ?? null,
    birthDate: row.birth_date ?? null,
    address: row.address ?? null,
    signatureData: row.signature_data ?? null,
    signedAt: row.signed_at ?? null,
    signedIp: row.signed_ip ?? null,
    signedUserAgent: row.signed_user_agent ?? null,
    idDocumentUrl: row.id_document_url ?? null,
    idDocumentName: row.id_document_name ?? null,
    idDocumentUploadedAt: row.id_document_uploaded_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at ?? null,
  }
}

export async function getAgreementTemplate(): Promise<AgreementTemplate> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_settings')
    .select('value')
    .eq('key', 'agreement_template')
    .maybeSingle()

  if (error) throw error
  const value = data?.value as Partial<AgreementTemplate> | undefined
  if (!value?.text) return DEFAULT_AGREEMENT_TEMPLATE
  return {
    title: value.title || DEFAULT_AGREEMENT_TEMPLATE.title,
    text: value.text,
    version: value.version || 'v1',
  }
}

export async function saveAgreementTemplate(template: { title: string; text: string }): Promise<AgreementTemplate> {
  const title = String(template.title || '').trim()
  const text = String(template.text || '').trim()
  if (!title || !text) throw new Error('Titel und Vertragstext sind erforderlich.')

  const current = await getAgreementTemplate()
  const currentVersion = Number(String(current.version || 'v1').replace(/^v/, '')) || 1
  const next: AgreementTemplate = {
    title,
    text,
    version: text === current.text && title === current.title ? current.version : `v${currentVersion + 1}`,
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_settings')
    .upsert({ key: 'agreement_template', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw error
  return next
}

export async function getAgreementForProfile(profileId: string): Promise<AgreementRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_agreements')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) throw error
  return data ? toAgreementRecord(data) : null
}

export async function submitAgreement(input: {
  profileId: string
  fullName: string
  birthDate?: string | null
  address?: string | null
  signatureData: string
  idDocumentUrl: string
  idDocumentName?: string | null
  signedIp?: string | null
  signedUserAgent?: string | null
}): Promise<AgreementRecord> {
  const fullName = String(input.fullName || '').trim()
  if (!fullName) throw new Error('Vollständiger Name ist erforderlich.')

  const signatureData = String(input.signatureData || '')
  if (!signatureData.startsWith('data:image/png;base64,') || signatureData.length < 200) {
    throw new Error('Unterschrift fehlt oder ist ungültig.')
  }
  if (signatureData.length > 500_000) {
    throw new Error('Unterschrift ist zu groß.')
  }

  const idDocumentUrl = String(input.idDocumentUrl || '').trim()
  if (!/^https:\/\/([a-z0-9-]+\.)?(utfs\.io|ufs\.sh|uploadthing\.com)\//.test(idDocumentUrl)) {
    throw new Error('Ausweisdokument fehlt oder ist ungültig.')
  }

  const template = await getAgreementTemplate()
  const now = new Date().toISOString()

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_agreements')
    .upsert({
      profile_id: input.profileId,
      status: 'submitted',
      contract_version: template.version,
      contract_text: `${template.title}\n\n${template.text}`,
      full_name: fullName,
      birth_date: input.birthDate || null,
      address: input.address ? String(input.address).trim() || null : null,
      signature_data: signatureData,
      signed_at: now,
      signed_ip: input.signedIp ?? null,
      signed_user_agent: input.signedUserAgent ?? null,
      id_document_url: idDocumentUrl,
      id_document_name: input.idDocumentName ?? null,
      id_document_uploaded_at: now,
      rejection_reason: null,
      reviewed_at: null,
    }, { onConflict: 'profile_id' })
    .select('*')
    .single()

  if (error) throw error
  return toAgreementRecord(data)
}

export async function listAgreementsAdmin(): Promise<Array<AgreementRecord & { profileName: string; profileEmail: string }>> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_agreements')
    .select('*, profile:mpu_profiles(id,first_name,last_name,email)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row: any) => ({
    ...toAgreementRecord(row),
    profileName: [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ') || 'Unbekannt',
    profileEmail: row.profile?.email || '',
  }))
}

export async function reviewAgreement(id: string, input: {
  status: 'approved' | 'rejected'
  rejectionReason?: string | null
}): Promise<AgreementRecord> {
  if (!['approved', 'rejected'].includes(input.status)) {
    throw new Error('Ungültiger Status.')
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_agreements')
    .update({
      status: input.status,
      rejection_reason: input.status === 'rejected' ? (input.rejectionReason || 'Bitte Unterlagen erneut einreichen.') : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return toAgreementRecord(data)
}
