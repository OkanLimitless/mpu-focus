'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  PenLine,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import SignaturePad from '@/components/ui/signature-pad'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { uploadFiles } from '@/lib/uploadthing-upload'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

type AgreementState = {
  status: 'pending' | 'submitted' | 'approved' | 'rejected'
  contractVersion: number | string | null
  fullName: string | null
  signedAt: string | null
  rejectionReason: string | null
  idDocumentName: string | null
} | null

type TemplateState = {
  title: string
  text: string
  version: number | string
} | null

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function StepHeading({ step, title, icon: Icon }: { step: number; title: string; icon: typeof FileText }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Schritt {step}</p>
        <h2 className={cn(displayFont.className, 'text-xl font-bold tracking-tight text-slate-950')}>
          {title}
        </h2>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [agreement, setAgreement] = useState<AgreementState>(null)
  const [template, setTemplate] = useState<TemplateState>(null)

  const [accepted, setAccepted] = useState(false)
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null)
  const [idDocumentName, setIdDocumentName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const prefilledRef = useRef(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    if (prefilledRef.current) return
    const firstName = session?.user?.firstName?.trim()
    const lastName = session?.user?.lastName?.trim()
    const name = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (name) {
      prefilledRef.current = true
      setFullName((current) => current || name)
    }
  }, [session])

  const loadAgreement = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agreements/me', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Die Vereinbarung konnte nicht geladen werden.')
      }
      setAgreement(payload.agreement || null)
      setTemplate(payload.template || null)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Vereinbarung konnte nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      loadAgreement()
    }
  }, [sessionStatus, loadAgreement])

  const handleFileSelected = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    try {
      const results = await uploadFiles('idDocumentUploader', {
        files: [file],
        onUploadProgress: (p) => {
          setUploadProgress(Math.round(p.totalProgress))
        },
      })
      const result = results?.[0]
      const url = (result as any)?.ufsUrl || (result as any)?.url
      if (!url) {
        throw new Error('Der Upload hat keine Datei-URL zurückgegeben.')
      }
      setIdDocumentUrl(url)
      setIdDocumentName(result.name || file.name)
      toast({
        title: 'Dokument hochgeladen',
        description: 'Ihr Ausweisdokument wurde erfolgreich hochgeladen.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Upload fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Das Dokument konnte nicht hochgeladen werden.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const canSubmit = accepted && fullName.trim().length > 0 && !!idDocumentUrl && !!signatureData && !submitting

  const handleSubmit = async () => {
    if (!canSubmit || !idDocumentUrl || !signatureData) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/agreements/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          birthDate: birthDate || undefined,
          address: address.trim() || undefined,
          signatureData,
          idDocumentUrl,
          idDocumentName: idDocumentName || 'Ausweisdokument',
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (response.status === 409) {
        toast({
          title: 'Bereits übermittelt',
          description: 'Ihre Vereinbarung liegt uns bereits vor und wird geprüft.',
        })
        await loadAgreement()
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Die Vereinbarung konnte nicht übermittelt werden.')
      }

      toast({
        title: 'Vereinbarung übermittelt',
        description: 'Vielen Dank! Unser Team prüft Ihre Unterlagen in Kürze.',
      })
      await loadAgreement()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Vereinbarung konnte nicht übermittelt werden.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className={cn(bodyFont.className, 'flex min-h-screen items-center justify-center bg-[#f6f8fb] text-slate-900')}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-600/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
              <FileText className="h-8 w-8 animate-pulse text-blue-600" aria-hidden="true" />
            </div>
          </div>
          <p className={cn(displayFont.className, 'text-sm font-bold uppercase tracking-[0.18em] text-slate-500')}>
            Onboarding wird geladen...
          </p>
        </div>
      </div>
    )
  }

  const showFlow = !agreement || agreement.status === 'pending' || agreement.status === 'rejected'

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-[#f6f8fb] text-slate-900 selection:bg-blue-200 selection:text-slate-950')}>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className={cn(displayFont.className, 'truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl')}>
              MPU <span className="text-blue-600">Focus</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Onboarding
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-red-600"
            aria-label="Abmelden"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        {agreement?.status === 'submitted' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-950 md:text-3xl')}>
              Vielen Dank! Ihre Vereinbarung wurde übermittelt.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Unser Team prüft Ihre Unterlagen in Kürze. Sie müssen nichts weiter tun &ndash;
              eingereicht am {formatDate(agreement.signedAt)}.
            </p>
            <Button
              className="mt-8 h-12 rounded-xl bg-blue-600 px-8 font-bold text-white hover:bg-blue-700"
              onClick={() => router.push('/learn')}
            >
              Zur Akademie <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </section>
        )}

        {agreement?.status === 'approved' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-950 md:text-3xl')}>
              Alles erledigt
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              Ihre Betreuungsvereinbarung wurde bestätigt. Sie können direkt mit Ihrer
              Vorbereitung in der Akademie starten.
            </p>
            <Button
              className="mt-8 h-12 rounded-xl bg-emerald-600 px-8 font-bold text-white hover:bg-emerald-700"
              onClick={() => router.push('/learn')}
            >
              Zur Akademie <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </section>
        )}

        {showFlow && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)] md:p-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                <ShieldCheck className="h-4 w-4 text-blue-300" aria-hidden="true" />
                Betreuungsvereinbarung
              </span>
              <h2 className={cn(displayFont.className, 'mt-4 text-2xl font-bold tracking-tight md:text-3xl')}>
                Willkommen bei MPU Focus
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 md:text-base">
                Bevor es losgeht, unterzeichnen Sie bitte die Betreuungsvereinbarung und laden
                ein Ausweisdokument hoch. Das dauert nur wenige Minuten.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {[
                  { step: 1, label: 'Vereinbarung lesen', done: accepted },
                  { step: 2, label: 'Angaben & Ausweis', done: fullName.trim().length > 0 && !!idDocumentUrl },
                  { step: 3, label: 'Unterschreiben', done: !!signatureData },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold',
                      item.done
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-white/[0.06] text-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black',
                        item.done ? 'bg-emerald-400 text-slate-950' : 'bg-white/15 text-white',
                      )}
                    >
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : item.step}
                    </span>
                    {item.label}
                  </div>
                ))}
              </div>
            </section>

            {agreement?.status === 'rejected' && (
              <section className="flex gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 md:p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className={cn(displayFont.className, 'font-bold text-red-800')}>
                    Ihre Einreichung wurde abgelehnt
                  </p>
                  <p className="mt-1 text-sm leading-6 text-red-700">
                    {agreement.rejectionReason || 'Bitte reichen Sie die Vereinbarung erneut ein.'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    Bitte führen Sie die folgenden Schritte erneut durch.
                  </p>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:p-7">
              <StepHeading step={1} title="Vereinbarung lesen" icon={FileText} />
              <h3 className={cn(displayFont.className, 'mb-3 text-lg font-bold text-slate-900')}>
                {template?.title || 'Betreuungsvereinbarung'}
              </h3>
              <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                  {template?.text || 'Der Vertragstext konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.'}
                </p>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                  className="mt-0.5"
                  aria-label="Vereinbarung akzeptieren"
                />
                <span className="text-sm font-semibold leading-6 text-slate-800">
                  Ich habe die Vereinbarung gelesen und stimme ihr zu.
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:p-7">
              <StepHeading step={2} title="Ihre Angaben & Ausweis" icon={CreditCard} />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-bold text-slate-700">
                    Vollständiger Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Vor- und Nachname"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-sm font-bold text-slate-700">
                    Geburtsdatum <span className="text-xs font-semibold text-slate-400">(empfohlen)</span>
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-bold text-slate-700">
                    Anschrift <span className="text-xs font-semibold text-slate-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="address"
                    rows={2}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Straße und Hausnummer, PLZ und Ort"
                    className="rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-bold text-slate-700">
                  Ausweis oder Reisepass hochladen (Foto oder PDF) <span className="text-red-500">*</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(event) => handleFileSelected(event.target.files?.[0] || null)}
                />

                {idDocumentUrl ? (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <p className="truncate text-sm font-bold text-emerald-800">
                        {idDocumentName || 'Ausweisdokument'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIdDocumentUrl(null)
                        setIdDocumentName(null)
                      }}
                      className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-red-600"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Entfernen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                      'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors',
                      uploading ? 'cursor-wait' : 'hover:border-blue-300 hover:bg-blue-50/40',
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                      <UploadCloud className="h-6 w-6" aria-hidden="true" />
                    </div>
                    {uploading ? (
                      <div className="w-full max-w-xs">
                        <p className="text-sm font-bold text-slate-700">
                          Wird hochgeladen... {uploadProgress}%
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-700">
                          Klicken Sie hier, um Ihr Dokument auszuwählen
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Foto (JPG, PNG) oder PDF, max. 16 MB
                        </p>
                      </>
                    )}
                  </button>
                )}

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Ihr Dokument wird verschlüsselt übertragen und nur zur Vertragsabwicklung gespeichert.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:p-7">
              <StepHeading step={3} title="Unterschreiben" icon={PenLine} />
              <SignaturePad onChange={setSignatureData} />
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Mit Ihrer Unterschrift bestätigen Sie die Vereinbarung (Version {template?.version ?? '-'}).
                Datum und technische Daten werden zur Nachweisbarkeit gespeichert.
              </p>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-6 h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {submitting ? 'Wird übermittelt...' : 'Vereinbarung verbindlich unterzeichnen'}
              </Button>
              {!canSubmit && !submitting && (
                <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                  Bitte schließen Sie alle drei Schritte ab, um die Vereinbarung zu unterzeichnen.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
