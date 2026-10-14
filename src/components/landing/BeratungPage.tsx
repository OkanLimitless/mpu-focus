'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { LeadRegion } from '@/lib/lead-acquisition'
import type { BeratungContent } from '@/lib/beratung-content'
import BeratungReviews from './BeratungReviews'
import { submitBeratungRequest } from '@/lib/beratung-submit'
import {
  getBeratungSteps,
  buildBeratungLeadPayload,
  CALLBACK_OPTIONS,
  contactErrors,
  type QuizData,
  type ContactData,
} from '@/lib/beratung-flow'
import {
  getLeadAttribution,
  trackBeratungLead,
  trackBeratungContact,
  startBeratungTracking,
} from '@/lib/ads-tracking'
import { Button } from '@/components/ui/button'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import ContactForm from '@/components/enrollment/ContactForm'

export default function BeratungPage({
  content,
  preview = false,
  previewStep = 0,
  contactLinks = { phone: null, whatsapp: null },
  region = 'general',
}: {
  content: BeratungContent
  preview?: boolean
  previewStep?: number
  contactLinks?: { phone: string | null; whatsapp: string | null }
  region?: LeadRegion
}) {
  const [step, setStep] = useState(0)
  const [quiz, setQuiz] = useState<QuizData>({
    reason: '',
    timeframe: '',
    jobLoss: undefined,
    mpuChallenges: [],
    concerns: [],
    availability: [],
  })
  const [contact, setContact] = useState<ContactData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    privacyConsent: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const requestId = useRef<string | null>(null)
  const submitting = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const steps = getBeratungSteps(content)
  useEffect(() => {
    if (
      preview &&
      Number.isInteger(previewStep) &&
      previewStep >= 0 &&
      previewStep <= 3
    ) {
      setStep(Math.min(previewStep, 2))
      setSubmitted(previewStep === 3)
    }
  }, [preview, previewStep])
  useEffect(() => {
    if (preview) return
    return startBeratungTracking()
  }, [preview])
  function navigate(next: number) {
    setStep(next)
    setError('')
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      document
        .getElementById('beratung-form')
        ?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (preview || submitting.current) return
    const errors = contactErrors(contact)
    if (
      Object.values(errors).some(Boolean) ||
      !quiz.reason ||
      !quiz.timeframe
    ) {
      setError(
        'Bitte prüfen Sie Ihre Angaben und die Zustimmung zur Kontaktaufnahme.'
      )
      setShowErrors(true)
      const firstError = Object.entries(errors).find(([, message]) => message)?.[0]
      if (firstError) document.getElementById(firstError)?.focus()
      return
    }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      requestId.current ??= crypto.randomUUID()
      const result = await submitBeratungRequest({
          ...buildBeratungLeadPayload(contact, quiz),
          attribution: getLeadAttribution(),
          region,
          requestId: requestId.current,
      })
      // Tracking must never turn a successfully stored lead into a form error.
      try {
        trackBeratungLead(String(result.leadId), region)
      } catch {
        /* Optional measurement. */
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (err) {
      setError(
        err instanceof Error && !(err instanceof TypeError)
          ? err.message
          : 'Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  const active = steps[step]
  const selected = active ? quiz[active.field] : ''
  return (
    <div className="min-h-screen break-words bg-[#f5f8fc] text-slate-900 selection:bg-blue-100">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight"
            onClick={(e) => {
              if (preview) e.preventDefault()
            }}
          >
            MPU <span className="text-blue-600">Focus</span>
            <span className="text-blue-600">.</span>
          </Link>
          <span className="flex max-w-[60%] items-center gap-1.5 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
            {content.headerSecurity}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pt-10">
        {submitted ? (
          <section
            className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10"
            aria-live="polite"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {content.successTitle}
            </h1>
            <p className="mt-3 text-slate-600">{content.successDescription}</p>
            <div className="my-6 rounded-xl bg-blue-50 p-5 text-left">
              <h2 className="flex items-center gap-2 font-semibold text-blue-900">
                <Phone className="h-4 w-4" />
                {content.successCallbackTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {content.successCallbackDescription}
              </p>
              {quiz.availability.length > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  Ihr Rückrufwunsch: {quiz.availability.join(', ')}
                </p>
              )}
            </div>
            <ul className="grid gap-3 text-left text-sm sm:grid-cols-2">
              {[
                content.successBenefit1,
                content.successBenefit2,
                content.successBenefit3,
                content.successBenefit4,
              ].map((text, i) => (
                <li key={i} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="mt-8 inline-flex min-h-[48px] items-center gap-2 font-semibold text-blue-600"
              onClick={(e) => {
                if (preview) e.preventDefault()
              }}
            >
              {content.successHomeLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <section
              id="intro"
              className="mx-auto mb-6 max-w-xl text-center sm:mb-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                {content.introBadge}
              </p>
              <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl">
                {content.introTitle}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                {content.introDescription}
              </p>
            </section>
            <div className="mx-auto grid max-w-xl items-start gap-4 lg:max-w-none lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-8">
              <section id="adviser" aria-label="Ihr Ansprechpartner" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:block lg:p-6">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl lg:mb-5 lg:aspect-[1178/1335] lg:h-auto lg:w-full">
                  <Image src="/advisers/mustafa-sahin-v1.png" alt={content.adviserName} fill priority sizes="(min-width: 1024px) 300px, 132px" className="origin-[50%_20%] scale-[1.65] object-cover lg:scale-100" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold lg:text-xl">{content.adviserName}</h2>
                  <p className="mt-1 text-xs font-medium text-blue-700 lg:text-sm">{content.adviserRole}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 lg:text-sm">{content.adviserDescription}</p>
                </div>
              </section>
            <div
              id="beratung-form"
              className="w-full min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_48px_-24px_rgba(15,23,42,0.25)]"
            >
              <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-8">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-600">
                    Schritt {step + 1} von 3
                  </span>
                  <span className="text-slate-500">
                    {['Ihr Anliegen', 'Ihr Zeitrahmen', 'Ihr Rückruf'][step]}
                  </span>
                </div>
                <div
                  className="flex gap-2"
                  aria-label={`Schritt ${step + 1} von 3`}
                >
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-blue-600' : 'bg-slate-100'}`}
                    />
                  ))}
                </div>
              </div>
              <form onSubmit={submit} noValidate className="p-5 sm:p-8" aria-busy={busy} onChange={() => { requestId.current = null }}>
                <h2
                  id={step < 2 ? 'question' : 'contact'}
                  ref={heading}
                  tabIndex={-1}
                  className="scroll-mt-4 text-xl font-bold leading-snug outline-none sm:text-2xl"
                >
                  {active?.question ?? content.contactTitle}
                </h2>
                {active ? (
                  <fieldset
                    className={`mt-4 ${step === 0 ? 'grid grid-cols-2 gap-2' : 'space-y-2.5'}`}
                    aria-label={active.question}
                  >
                    {active.options.map((option) => (
                      <label
                        key={option}
                        className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${selected === option ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                      >
                        <input
                          type="radio"
                          name={active.field}
                          value={option}
                          checked={selected === option}
                          onChange={() =>
                            setQuiz((previous) => ({
                              ...previous,
                              [active.field]: option,
                            }))
                          }
                          className="h-4 w-4 shrink-0 accent-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <fieldset disabled={busy} className="mt-3 min-w-0 space-y-5">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {content.contactDescription}
                    </p>
                    <ContactForm
                      data={contact}
                      showErrors={showErrors}
                      onChange={(key, value) =>
                        setContact((previous) => ({
                          ...previous,
                          [key]: value,
                        }))
                      }
                      copy={{
                        title: content.contactFormTitle,
                        hint: content.contactFormHint,
                        phoneHint: content.contactPhoneHint,
                      }}
                    />
                    <details className="rounded-xl border border-slate-200 px-3">
                      <summary className="cursor-pointer py-3 text-sm font-medium text-slate-700">Rückrufzeit auswählen <span className="font-normal text-slate-500">(optional{quiz.availability.length ? ` · ${quiz.availability.length} ausgewählt` : ''})</span></summary>
                    <fieldset className="pb-4">
                      <legend className="text-sm font-semibold">
                        {content.question6}
                      </legend>
                      <p className="mb-3 mt-1 text-xs text-slate-500">
                        {content.questionHint6}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CALLBACK_OPTIONS.map((option) => (
                          <label
                            key={option}
                            className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${quiz.availability.includes(option) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-blue-600"
                              checked={quiz.availability.includes(option)}
                              onChange={(e) =>
                                setQuiz((previous) => ({
                                  ...previous,
                                  availability: e.target.checked
                                    ? [...previous.availability, option]
                                    : previous.availability.filter(
                                        (item) => item !== option
                                      ),
                                }))
                              }
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500">
                        {content.contactCallback}
                      </p>
                    </fieldset>
                    </details>
                  </fieldset>
                )}
                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Zurück zum vorherigen Schritt"
                      disabled={busy}
                      onClick={() => navigate(step - 1)}
                      className="h-12 w-12 shrink-0 p-0"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  {active ? (
                    <Button
                      key="next"
                      type="button"
                      disabled={!selected}
                      onClick={() => navigate(step + 1)}
                      className="h-auto min-h-[48px] flex-1 whitespace-normal rounded-xl bg-blue-600 px-3 py-3 text-base font-semibold hover:bg-blue-700"
                    >
                      {content.nextLabel}
                      <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  ) : (
                    <Button
                      key="submit"
                      type="submit"
                      disabled={busy || preview}
                      className="h-auto min-h-[52px] flex-1 whitespace-normal rounded-xl bg-blue-600 px-3 py-3 text-base font-semibold hover:bg-blue-700"
                    >
                      {busy ? 'Wird gesendet …' : content.submitLabel}
                    </Button>
                  )}
                </div>
                {step === 2 && preview && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Vorschau · es werden keine Anfragen gesendet.
                  </p>
                )}
                <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                  {step < 2 ? content.introCallback : content.headerSuccess}
                </p>
              </form>
            </div>
            </div>
            <BeratungReviews content={content} preview={preview} />
            <section
              id="trust"
              className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-x-5 gap-y-4 text-sm"
            >
              {[1, 2, 3, 4].map((number) => (
                <div key={number} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">
                      {content[`trustTitle${number}` as keyof BeratungContent]}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {content[`trustText${number}` as keyof BeratungContent]}
                    </p>
                  </div>
                </div>
              ))}
            </section>
            <section
              id="benefits"
              className="mx-auto mt-10 max-w-xl border-t border-slate-200 pt-6"
            >
              <h2 className="font-bold">{content.benefitsTitle}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                {[
                  content.benefit1,
                  content.benefit2,
                  content.benefit3,
                  content.benefit4,
                ].map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </section>
          </>
        )}
        {(preview || contactLinks.phone || contactLinks.whatsapp) && (
          <section aria-label="Direkter Kontakt" className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-slate-700">{content.directContactTitle}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {(['phone', 'whatsapp'] as const).map(channel => {
                const href = contactLinks[channel]
                const label = channel === 'phone' ? content.phoneLabel : content.whatsappLabel
                const style = 'inline-flex min-h-[48px] items-center justify-center rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700'
                if (preview) return <button key={channel} type="button" disabled className={`${style} opacity-60`}>{label}</button>
                return href ? <a key={channel} href={href} className={style}
                  target={channel === 'whatsapp' ? '_blank' : undefined} rel="noopener noreferrer"
                  onClick={() => { try { trackBeratungContact(channel, region) } catch { /* Contact must work without measurement. */ } }}
                >{label}</a> : null
              })}
            </div>
            {preview && <p className="mt-3 text-xs text-slate-500">Vorschau · echte Kontaktdaten werden separat eingerichtet.</p>}
          </section>
        )}
        <footer className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-slate-500">
          <Link href="/impressum" className="py-3 underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="py-3 underline">
            Datenschutz
          </Link>
          <button
            type="button"
            className="py-3 underline"
            onClick={() => {
              if (!preview) window.dispatchEvent(new Event('mpu-open-consent'))
            }}
          >
            Cookie-Einstellungen
          </button>
        </footer>
      </main>
    </div>
  )
}
