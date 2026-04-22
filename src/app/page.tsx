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
  FileCheck2,
  GraduationCap,
  Menu,
  MessageCircle,
  PhoneCall,
  Route,
  ShieldCheck,
  Sparkles,
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
  { name: 'Akademie', href: '#akademie' },
  { name: 'FAQ', href: '#faq' },
  { name: 'Kontakt', href: '#kontakt' },
]

const heroBenefits = [
  'Kostenfreie Ersteinschätzung Ihres Falls',
  'Persönlicher Plan statt Standardkurs',
  'Lernplattform erst nach individueller Freigabe',
]

const trustFacts = [
  { value: '24h', label: 'Rückmeldung an Werktagen' },
  { value: '1:1', label: 'Persönliche Begleitung' },
  { value: 'Manuell', label: 'Freigabe nach Abstimmung' },
]

const serviceItems = [
  {
    title: 'Standort sauber klären',
    description:
      'Wir ordnen MPU-Grund, Nachweise und Gesprächsrisiken verständlich ein, bevor Sie Zeit oder Geld investieren.',
    icon: FileCheck2,
  },
  {
    title: 'Vorbereitung fokussieren',
    description:
      'Sie erhalten konkrete Schritte, klare Prioritäten und realistische Gesprächsvorbereitung für Ihren Fall.',
    icon: Route,
  },
  {
    title: 'Sicherer auftreten',
    description:
      'Mit persönlichem Feedback und Simulationen wird aus Unsicherheit ein nachvollziehbarer roter Faden.',
    icon: MessageCircle,
  },
]

const processSteps = [
  {
    title: 'Erstgespräch',
    description:
      'Wir sprechen über den Anlass der MPU, Ihre Unterlagen und die wichtigsten Risiken in Ihrem Fall.',
  },
  {
    title: 'Empfehlung',
    description:
      'Sie bekommen eine klare Einschätzung, welche Vorbereitung sinnvoll ist und was Sie nicht brauchen.',
  },
  {
    title: 'Begleitung',
    description:
      'Die Vorbereitung startet mit festen Schritten, persönlicher Rückmeldung und nachvollziehbaren Aufgaben.',
  },
  {
    title: 'Akademie-Zugang',
    description:
      'Die Lernplattform wird erst nach Abstimmung, Zahlung und persönlicher Freigabe aktiviert.',
  },
]

const faqs = [
  {
    question: 'Ist das Erstgespräch kostenlos?',
    answer:
      'Ja. Wir klären zuerst Ihren Fall, den sinnvollen Vorbereitungsweg und ob eine Zusammenarbeit aktuell passt.',
  },
  {
    question: 'Bekomme ich sofort Zugang zur Plattform?',
    answer:
      'Nein. MPU Focus ist keine automatische Selbstregistrierung. Der Zugang wird nach persönlicher Abstimmung und Freigabe aktiviert.',
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

const contactBenefits = [
  'Kostenfreie Ersteinschätzung',
  'Klare Empfehlung ohne Verkaufsdruck',
  'Diskrete Rückmeldung an Werktagen',
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
          consentVersion: 'landing_v3',
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

  const scrollToContact = () => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className={cn(bodyFont.className, 'min-h-screen bg-[#f7f9fc] text-slate-950 selection:bg-blue-200 selection:text-slate-950')}>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/55 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className={cn(displayFont.className, 'text-lg font-bold tracking-tight')}>
              MPU Focus
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-white/75 transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
            <Button
              className="h-11 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 hover:bg-slate-100"
              onClick={scrollToContact}
            >
              Erstgespräch anfragen
            </Button>
          </div>

          <button
            className="rounded-md p-2 text-white md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-slate-950/95 px-5 py-5 md:hidden">
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
                className="mt-3 h-12 rounded-lg bg-white text-slate-950 hover:bg-slate-100"
                onClick={() => {
                  setMobileMenuOpen(false)
                  scrollToContact()
                }}
              >
                Erstgespräch anfragen
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="relative isolate min-h-[92svh] overflow-hidden bg-slate-950 text-white">
          <Image
            src="/landing-hero-consultation.png"
            alt="Persönliches Beratungsgespräch für eine strukturierte MPU-Vorbereitung"
            fill
            priority
            sizes="100vw"
            className="scale-[1.02] object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.82)_36%,rgba(2,6,23,0.42)_66%,rgba(2,6,23,0.22)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.46)_0%,rgba(2,6,23,0.06)_46%,rgba(2,6,23,0.70)_100%)]" />

          <div className="relative mx-auto flex min-h-[92svh] max-w-[1440px] items-end px-5 pb-12 pt-32 sm:px-6 lg:px-8 lg:pb-16">
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-700">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
                Persönliche MPU-Vorbereitung
              </p>

              <h1 className={cn(displayFont.className, 'text-6xl font-bold leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-8xl')}>
                MPU Focus
              </h1>

              <p className={cn(displayFont.className, 'mt-6 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl')}>
                Klarer Plan. Sicheres Gespräch. Persönliche Freigabe.
              </p>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                Wir begleiten Sie strukturiert zurück zum Führerschein: mit fachlicher Einschätzung,
                persönlicher Vorbereitung und einer Lernplattform, die bewusst erst nach Abstimmung
                freigeschaltet wird.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-lg bg-blue-600 px-7 text-base font-bold text-white hover:bg-blue-700"
                  onClick={scrollToContact}
                >
                  Kostenfreies Erstgespräch
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
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

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {heroBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3 border-t border-white/15 pt-4 text-sm font-semibold leading-6 text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
            {trustFacts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-5 border-t border-slate-200 pt-5 md:block md:border-l md:border-t-0 md:pl-7 md:first:border-l-0 md:first:pl-0">
                <div className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-950')}>
                  {fact.value}
                </div>
                <p className="max-w-[12rem] text-right text-sm font-semibold leading-6 text-slate-500 md:mt-2 md:text-left">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="leistungen" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Leistungen</p>
                <h2 className={cn(displayFont.className, 'mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl')}>
                  Erst Klarheit, dann Vorbereitung.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">
                MPU Focus reduziert Komplexität auf die nächsten sinnvollen Schritte. Keine
                automatische Kursstrecke, sondern persönliche Einordnung und gezielte Begleitung.
              </p>
            </div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-stretch">
              <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-slate-900">
                <Image
                  src="/landing-preparation-detail.png"
                  alt="Strukturierte Vorbereitung mit Unterlagen und persönlicher Beratung"
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
              </div>

              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {serviceItems.map((item) => (
                  <div key={item.title} className="group grid gap-5 py-7 sm:grid-cols-[56px_1fr]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="ablauf" className="bg-[#eef3f9] py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Ablauf</p>
              <h2 className={cn(displayFont.className, 'mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl')}>
                Ein ruhiger Prozess mit klaren Entscheidungen.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Sie wissen jederzeit, warum der nächste Schritt relevant ist und was vor der MPU
                wirklich sitzen muss.
              </p>
            </div>

            <div className="divide-y divide-slate-300/80 border-y border-slate-300/80">
              {processSteps.map((step, index) => (
                <div key={step.title} className="grid gap-5 py-7 sm:grid-cols-[96px_1fr]">
                  <div className={cn(displayFont.className, 'text-2xl font-bold text-slate-400')}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-base leading-7 text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="akademie" className="overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8">
            <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-slate-900 lg:min-h-[560px]">
              <Image
                src="/landing-academy-detail-v2.png"
                alt="Digitaler Lernbereich zur persönlichen MPU-Vorbereitung"
                fill
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white">
                  <GraduationCap className="h-5 w-5 text-blue-300" aria-hidden="true" />
                  Akademie nach Freigabe
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Akademie</p>
              <h2 className={cn(displayFont.className, 'mt-4 text-4xl font-bold tracking-tight sm:text-5xl')}>
                Digital lernen, persönlich geführt bleiben.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Die Lernplattform ergänzt die persönliche Vorbereitung. Sie wird nicht verkauft wie
                ein Sofortprodukt, sondern passend zu Ihrem Fall freigeschaltet.
              </p>

              <div className="mt-9 space-y-5 border-t border-white/10 pt-8">
                <div className="flex items-start gap-4">
                  <PhoneCall className="mt-1 h-6 w-6 shrink-0 text-blue-300" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-white">Erst Gespräch, dann Angebot</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Der Zugang folgt erst, wenn der Vorbereitungsweg geklärt ist.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock3 className="mt-1 h-6 w-6 shrink-0 text-blue-300" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-white">Freischaltung nach Bestätigung</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Zahlung und Zugang laufen bewusst kontrolliert statt automatisch.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-blue-300" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-white">Keine falschen Erwartungen</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">Sie starten nur mit einem Setup, das zu Ihrer Situation passt.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">FAQ</p>
              <h2 className={cn(displayFont.className, 'mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl')}>
                Antworten ohne Kleingedrucktes.
              </h2>
            </div>

            <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-slate-950">
                    <span>{faq.question}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                  </summary>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="kontakt" className="bg-[#eef3f9] py-20 sm:py-24">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
            <div className="grid overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:grid-cols-[0.86fr_1.14fr]">
              <div className="relative min-h-[420px] bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
                <Image
                  src="/landing-hero-consultation.png"
                  alt="Diskretes Erstgespräch zur MPU-Vorbereitung"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-slate-950/65" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Kontakt</p>
                    <h2 className={cn(displayFont.className, 'mt-4 text-4xl font-bold tracking-tight sm:text-5xl')}>
                      Fordern Sie Ihr Erstgespräch an.
                    </h2>
                    <p className="mt-5 text-base leading-7 text-slate-300">
                      Wir melden uns mit einer fachlichen Ersteinschätzung. Erst danach entscheiden
                      Sie, welcher Weg sinnvoll ist.
                    </p>
                  </div>

                  <div className="mt-10 space-y-4 border-t border-white/10 pt-7">
                    {contactBenefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3 text-sm font-semibold text-slate-200">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12">
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

                  <label className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      required
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span>
                      Ich habe die{' '}
                      <Link href="/datenschutz" className="font-semibold text-slate-800 underline transition-colors hover:text-blue-600">
                        Datenschutzerklärung
                      </Link>{' '}
                      gelesen und stimme der Verarbeitung meiner Daten zur Kontaktaufnahme zu.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    disabled={submitting || !privacyConsent}
                    className="h-14 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700"
                  >
                    {submitting ? 'Wird übermittelt...' : 'Erstgespräch anfragen'}
                  </Button>

                  <p className="text-center text-sm text-slate-500">
                    Sichere Datenübertragung ·{' '}
                    <Link href="/impressum" className="underline transition-colors hover:text-slate-800">
                      Impressum
                    </Link>{' '}
                    ·{' '}
                    <Link href="/datenschutz" className="underline transition-colors hover:text-slate-800">
                      Datenschutz
                    </Link>
                  </p>

                  {submitted && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-start gap-3 text-emerald-800">
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
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
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
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
