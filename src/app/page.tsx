'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Menu,
  PhoneCall,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const navLinks = [
  { name: 'Leistungen', href: '#leistungen' },
  { name: 'Ablauf', href: '#ablauf' },
  { name: 'FAQ', href: '#faq' },
  { name: 'Kontakt', href: '#kontakt' },
]

const serviceItems = [
  {
    title: 'Klare Standortanalyse',
    description:
      'Wir bewerten Ihren Fall fachlich, ordnen die MPU-Anforderungen ein und zeigen, was jetzt wirklich nötig ist.',
    icon: Users,
  },
  {
    title: 'Individuelle Vorbereitung',
    description:
      'Sie erhalten einen strukturierten Plan, persönliche Begleitung und konkrete Antworten statt allgemeiner Ratschläge.',
    icon: ShieldCheck,
  },
  {
    title: 'Gesprächssicherheit',
    description:
      'Mit realistischen Gesprächssimulationen und psychologischer Vorbereitung gehen Sie sicherer in die MPU.',
    icon: Star,
  },
]

const processSteps = [
  {
    title: 'Erstgespräch',
    description:
      'Wir besprechen Ihre Situation, den MPU-Grund und den realistischen Weg zurück zum Führerschein.',
  },
  {
    title: 'Individuelles Angebot',
    description:
      'Sie erhalten eine klare Empfehlung für die passende Vorbereitung, ohne unnötige Umwege.',
  },
  {
    title: 'Beginn der Vorbereitung',
    description:
      'Nach Ihrer Zusage startet die persönliche Betreuung mit klaren Schritten und Lerninhalten.',
  },
  {
    title: 'Freischaltung der Lernplattform',
    description:
      'Der Zugang wird nach persönlicher Freigabe aktiviert. Es gibt aktuell keine automatische Selbstregistrierung.',
  },
]

const faqs = [
  {
    question: 'Ist das Erstgespräch kostenlos?',
    answer:
      'Ja. Im Erstgespräch klären wir Ihren Fall, den sinnvollen Vorbereitungsweg und ob eine Zusammenarbeit aktuell sinnvoll ist.',
  },
  {
    question: 'Bekomme ich sofort Zugang zur Plattform?',
    answer:
      'Nein. Der Zugang wird nach persönlicher Abstimmung und Freigabe aktiviert. Die Zahlungen laufen derzeit außerhalb der Plattform.',
  },
  {
    question: 'Für welche MPU-Fälle ist MPU Focus geeignet?',
    answer:
      'Für Alkohol-, Drogen-, Punkte- und weitere verkehrspsychologische Fragestellungen, sofern eine strukturierte Vorbereitung sinnvoll ist.',
  },
  {
    question: 'Wie schnell erhalte ich eine Rückmeldung?',
    answer:
      'In der Regel innerhalb von 24 Stunden an Werktagen. Bei dringenden Fällen priorisieren wir die Rückmeldung.',
  },
]

const heroBenefits = [
  'Persönliche Begleitung statt Standardkurs',
  'Diskrete Betreuung mit klarer Struktur',
  'Freischaltung erst nach persönlicher Abstimmung',
]

const trustFacts = [
  { value: '98%', label: 'Erfolgsquote im Erstversuch' },
  { value: '24h', label: 'Rückmeldung an Werktagen' },
  { value: '1:1', label: 'Persönliche Betreuung' },
]

export default function HomePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [goals, setGoals] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privacyConsent) {
      setError('Bitte stimmen Sie der Datenschutzerklärung zu.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          goals,
          source: 'landing-page-de',
          consentAccepted: privacyConsent,
          consentVersion: 'landing_v2',
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Ihre Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.')
      }

      setSubmitted(true)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setGoals('')
      setPrivacyConsent(false)
    } catch (err: any) {
      setError(err?.message || 'Ein technischer Fehler ist aufgetreten.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-white text-slate-900 selection:bg-primary/20 selection:text-slate-950')}>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-slate-950/55 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className={cn(displayFont.className, 'text-lg font-bold tracking-tight')}>
              MPU Focus
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-white/80 transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
            <Button
              className="rounded-lg bg-white text-slate-950 hover:bg-slate-100"
              onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Erstgespräch anfragen
            </Button>
          </div>

          <button
            className="rounded-md p-2 text-white md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Menü öffnen"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-slate-950/95 px-6 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-base font-semibold text-white/85"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Button
                className="mt-3 rounded-lg bg-white text-slate-950 hover:bg-slate-100"
                onClick={() => {
                  setMobileMenuOpen(false)
                  document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Erstgespräch anfragen
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-slate-950 text-white">
          <Image
            src="/mpu-hero-premium.png"
            alt="Persönliches MPU-Beratungsgespräch in heller, professioneller Umgebung"
            fill
            priority
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.76)_42%,rgba(2,6,23,0.35)_68%,rgba(2,6,23,0.18)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.45)_0%,rgba(2,6,23,0.1)_35%,rgba(2,6,23,0.55)_100%)]" />

          <div className="relative mx-auto flex min-h-[100svh] max-w-7xl items-end px-6 pb-16 pt-32 lg:px-8 lg:pb-20">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Professionelle MPU-Begleitung mit persönlicher Freigabe
              </div>

              <h1 className={cn(displayFont.className, 'max-w-xl text-5xl font-bold leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl')}>
                Ihr Weg zurück zum Führerschein, klar geführt und persönlich begleitet.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200 md:text-xl">
                MPU Focus begleitet Sie strukturiert durch Vorbereitung, Gesprächssicherheit und
                Lernplattform. Kein Massenprogramm, sondern persönliche Betreuung mit klaren
                nächsten Schritten.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-lg bg-primary px-7 text-base font-bold text-white hover:bg-primary/90"
                  onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Kostenfreies Erstgespräch
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-lg border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10"
                  onClick={() => document.getElementById('ablauf')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ablauf ansehen
                </Button>
              </div>

              <div className="mt-8 space-y-3">
                {heroBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm font-medium text-slate-200 md:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-3 lg:px-8">
            {trustFacts.map((fact) => (
              <div key={fact.label} className="border-l border-slate-200 pl-5 first:border-l-0 first:pl-0">
                <div className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-900')}>
                  {fact.value}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="leistungen" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Leistungen</p>
              <h2 className={cn(displayFont.className, 'mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl')}>
                Die Vorbereitung bleibt klar, persönlich und fachlich belastbar.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Wir reduzieren Komplexität, priorisieren das Entscheidende und begleiten Sie so,
                dass Sie jeden nächsten Schritt verstehen.
              </p>
            </div>

            <div className="mt-14 grid gap-8 border-t border-slate-200 pt-10 md:grid-cols-3">
              {serviceItems.map((item) => (
                <div key={item.title} className="border-b border-slate-200 pb-8 md:border-b-0 md:border-l md:pl-8 md:first:border-l-0 md:first:pl-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ablauf" className="bg-slate-50 py-24">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Ablauf</p>
              <h2 className={cn(displayFont.className, 'mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl')}>
                So läuft die Zusammenarbeit ab.
              </h2>

              <div className="mt-10 space-y-8">
                {processSteps.map((step, index) => (
                  <div key={step.title} className="grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-[88px_1fr]">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                      Schritt {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                      <p className="mt-2 text-base leading-7 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-start rounded-2xl bg-slate-900 p-8 text-white shadow-xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Wichtig für den Zugang</p>
              <h3 className={cn(displayFont.className, 'mt-3 text-3xl font-bold tracking-tight')}>
                Die Plattform wird bewusst nicht automatisch freigeschaltet.
              </h3>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Die Zahlungsabwicklung erfolgt aktuell außerhalb der Plattform. Der Lernbereich wird
                deshalb erst nach persönlicher Abstimmung und Freigabe aktiviert.
              </p>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>Erst Gespräch, dann passendes Angebot.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>Freischaltung nach Zahlung und persönlicher Bestätigung.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>Keine unnötige Selbstregistrierung, kein falscher Erwartungsdruck.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-24">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">FAQ</p>
              <h2 className={cn(displayFont.className, 'mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl')}>
                Klare Antworten auf die wichtigsten Fragen.
              </h2>
            </div>

            <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-slate-900">
                    <span>{faq.question}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="kontakt" className="bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-200/70">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="bg-slate-950 px-8 py-12 text-white sm:px-10 lg:px-12">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Kontakt</p>
                  <h2 className={cn(displayFont.className, 'mt-3 text-4xl font-bold tracking-tight')}>
                    Fordern Sie Ihr Erstgespräch an.
                  </h2>
                  <p className="mt-5 text-base leading-7 text-slate-300">
                    Wir melden uns mit einer fachlichen Ersteinschätzung. Zugang zur Lernplattform
                    gibt es erst nach persönlicher Abstimmung und Freigabe.
                  </p>

                  <div className="mt-10 space-y-5">
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Kostenfreie Ersteinschätzung Ihres Falls</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Persönliche Rückmeldung innerhalb von 24 Stunden an Werktagen</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm font-medium text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>Freischaltung der Akademie nach Zahlung und persönlicher Bestätigung</span>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-12 sm:px-10 lg:px-12">
                  <form className="space-y-6" onSubmit={onSubmit}>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Vorname</label>
                        <Input
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-14 rounded-lg border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Nachname</label>
                        <Input
                          placeholder="Mustermann"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-14 rounded-lg border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">E-Mail</label>
                        <Input
                          type="email"
                          placeholder="mail@beispiel.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-14 rounded-lg border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Telefonnummer</label>
                        <Input
                          type="tel"
                          placeholder="+49 123 45678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="h-14 rounded-lg border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Kurzbeschreibung Ihres Falls</label>
                      <Textarea
                        placeholder="Worum geht es in Ihrem Fall?"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows={4}
                        className="rounded-lg border-slate-200 bg-slate-50 p-4"
                      />
                    </div>

                    <label className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
                      <input
                        type="checkbox"
                        checked={privacyConsent}
                        onChange={(e) => setPrivacyConsent(e.target.checked)}
                        required
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span>
                        Ich habe die{' '}
                        <Link href="/datenschutz" className="font-semibold text-slate-800 underline transition-colors hover:text-primary">
                          Datenschutzerklärung
                        </Link>{' '}
                        gelesen und stimme der Verarbeitung meiner Daten zur Kontaktaufnahme zu.
                      </span>
                    </label>

                    <Button
                      type="submit"
                      disabled={submitting || !privacyConsent}
                      className="h-14 w-full rounded-lg bg-primary text-base font-bold text-white hover:bg-primary/90"
                    >
                      {submitting ? 'Wird übermittelt...' : 'Erstgespräch anfragen'}
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                      Sichere Datenübertragung •{' '}
                      <Link href="/impressum" className="underline transition-colors hover:text-slate-800">
                        Impressum
                      </Link>{' '}
                      •{' '}
                      <Link href="/datenschutz" className="underline transition-colors hover:text-slate-800">
                        Datenschutz
                      </Link>
                    </p>

                    {submitted && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex items-start gap-3 text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                          <div>
                            <p className="font-bold">Ihre Anfrage ist eingegangen.</p>
                            <p className="mt-1 text-sm text-emerald-700">
                              Wir melden uns in Kürze mit den nächsten Schritten.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                        {error}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className={cn(displayFont.className, 'text-xl font-bold tracking-tight text-white')}>
                MPU Focus
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Professionelle MPU-Vorbereitung mit persönlicher Begleitung, klarer Struktur und
              manueller Freischaltung nach Abstimmung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium">
            <Link href="/impressum" className="transition-colors hover:text-white">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-white">
              Datenschutz
            </Link>
            <Link href="/agb" className="transition-colors hover:text-white">
              AGB
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
