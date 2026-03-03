'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
  Star,
  Check,
  HelpCircle,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

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
      setError('Bitte stimmen Sie der Datenschutzerklaerung zu.')
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
          consentVersion: 'landing_v1',
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Submission-Fehler. Bitte versuchen Sie es erneut.')
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

  const navLinks = [
    { name: 'Vorteile', href: '#vorteile' },
    { name: 'Leistungen', href: '#leistungen' },
    { name: 'Ablauf', href: '#ablauf' },
    { name: 'FAQ', href: '#faq' },
  ]

  return (
    <div className={`${bodyFont.className} min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 selection:text-white`}>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:py-5">
          <Link href="/" className="flex items-center flex-shrink-0 group">
            <h1 className={`${displayFont.className} text-2xl font-bold tracking-tight text-white transition-transform group-hover:scale-[1.02]`}>
              MPU <span className="text-blue-500">Focus</span>
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-4 pl-6 border-l border-white/10">
              <Button
                size="sm"
                className="bg-blue-600 font-semibold text-white hover:bg-blue-500 rounded-full px-6 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Kostenlose Erstberatung
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`md:hidden absolute top-full left-0 w-full overflow-hidden transition-all duration-300 bg-slate-950 border-b border-white/10 ${mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-6 border-t border-white/10 mt-2">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 text-white font-semibold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Kostenlose Erstberatung
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 md:pt-32">
        {/* Premium Dark Hero Section */}
        <section className="bg-slate-950 pt-20 lg:pt-32 pb-0 overflow-hidden border-b border-white/10 relative">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

              {/* Left Content */}
              <div className="max-w-2xl pb-16 lg:pb-32 pt-12 lg:pt-16 text-center lg:text-left mx-auto lg:mx-0">
                <Badge variant="outline" className="mb-8 border-blue-500/30 bg-blue-500/10 py-1.5 px-5 text-blue-400 font-bold rounded-full uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(59,130,246,0.15)] flex inline-flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Zertifizierte Vorbereitung 2026
                </Badge>
                <h2 className={`${displayFont.className} text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-[4.5rem] lg:leading-[1.05] mb-8`}>
                  Ihr sicherster Weg <br className="hidden lg:block" /> zurück zum <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Führerschein.</span>
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-slate-300 md:text-xl font-medium max-w-lg mx-auto lg:mx-0 text-balance">
                  Professionelle, psychologische MPU-Vorbereitung auf höchstem Niveau. Strukturiert, diskret und exakt auf Ihren Fall abgestimmt.
                </p>
                <div className="mt-12 flex flex-col items-center justify-center lg:flex-row lg:justify-start gap-5">
                  <Button
                    size="lg"
                    className="h-14 w-full sm:w-auto rounded-xl bg-blue-600 px-8 text-lg font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all duration-300 group"
                    onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Erstgespräch vereinbaren
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full sm:w-auto rounded-xl px-8 text-lg font-bold border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors"
                    onClick={() => document.getElementById('ablauf')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Mehr erfahren
                  </Button>
                </div>
              </div>

              {/* Right Image Container - Premium Treatment */}
              <div className="relative h-[450px] sm:h-[550px] lg:h-[720px] w-full lg:-mr-32 xl:-mr-48 rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-t border-l border-white/10 animate-in fade-in slide-in-from-right-8 duration-1000">
                <Image
                  src="/mpu-hero-split.png"
                  alt="Premium MPU Beratung"
                  fill
                  className="object-cover object-center lg:object-left"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none lg:w-1/3" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Premium Trust Indicators Bar (Dark Theme) */}
          <div className="bg-slate-950/80 backdrop-blur-md border-t border-white/10 relative z-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 py-6">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="font-bold text-slate-200">4.9/5 Bewertung</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/10" />
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="font-bold text-slate-200">Experten-Team</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/10" />
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold text-slate-200">Völlige Diskretion</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Features Section */}
        <section id="vorteile" className="bg-white py-24 lg:py-32 border-b border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] rounded-full bg-blue-50 blur-[80px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="mb-16 md:flex justify-between items-end">
              <div className="max-w-2xl">
                <Badge variant="outline" className="mb-4 border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs">
                  Warum MPU Focus?
                </Badge>
                <h3 className={`${displayFont.className} text-3xl font-bold md:text-5xl tracking-tight text-slate-900`}>Expertise, der Sie vertrauen können.</h3>
                <p className="mt-6 text-slate-600 text-lg leading-relaxed">Ein positives Gutachten ist kein Zufall, sondern das Ergebnis professioneller psychologischer Aufarbeitung.</p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: 'Tiefgehende Analyse', desc: 'Präzise Aufarbeitung Ihrer individuellen Situation. Wir decken die Kernthemen auf, die der Gutachter erwartet.', icon: Users },
                { title: 'Gutachter-Simulation', desc: 'Realitätsnahe Gesprächstrainings bereiten Sie auf Stresssituationen vor und bauen Ängste effektiv ab.', icon: ShieldCheck },
                { title: 'Rechtssichere Prozesse', desc: 'Unsere methodische Vorbereitung ist konform mit den aktuellen Beurteilungskriterien (Beurteilungskriterien 4. Auflage).', icon: CheckCircle2 }
              ].map((feat, i) => (
                <div key={i} className="group relative border border-slate-200 rounded-3xl p-8 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)] hover:border-blue-200 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[40px] -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <feat.icon className="h-7 w-7 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-3">{feat.title}</h4>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium Services Section */}
        <section id="leistungen" className="bg-slate-50 py-24 lg:py-32 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div>
                <Badge variant="outline" className="mb-6 border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-wider text-xs px-4 py-1.5 rounded-full">
                  Individuelle Spezialisierung
                </Badge>
                <h3 className={`${displayFont.className} text-4xl font-bold md:text-5xl leading-tight mb-6 text-slate-900`}>
                  Maßgeschneidert auf Ihren Fall.
                </h3>
                <p className="text-slate-600 text-lg md:text-xl mb-10 leading-relaxed">
                  Jede Anordnung zur MPU hat unterschiedliche Hintergründe. Wir bieten spezialisierte Vorbereitungen, die genau auf Ihre behördlichen Auflagen zugeschnitten sind.
                </p>
                <div className="space-y-8">
                  {[
                    { title: "Alkohol-Fragestellung", desc: "Begleitung bei Abstinenznachweisen und psychologische Erarbeitung von Trinkmotiven sowie Vermeidungsstrategien." },
                    { title: "Drogen-Fragestellung", desc: "Konsequente Aufarbeitung des Konsumverhaltens und Vorbereitung auf die medizinisch-toxikologischen Anforderungen." },
                    { title: "Punkte-Fragestellung", desc: "Analyse Ihrer Verkehrszuwiderhandlungen und Entwicklung von Strategien zur konsequenten, dauerhaften Regelakzeptanz." }
                  ].map((service, i) => (
                    <div key={i} className="flex gap-5 group">
                      <div className="mt-1 shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_4px_15px_rgba(37,99,235,0.15)] group-hover:border-blue-100">
                        <Check className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xl mb-2">{service.title}</h5>
                        <p className="text-slate-600 leading-relaxed">{service.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative aspect-[4/5] lg:aspect-[4/5] rounded-[2.5rem] bg-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200/50 animate-in fade-in zoom-in-95 duration-1000 delay-200 group">
                <Image
                  src="/mpu-analysis.png"
                  alt="MPU Aktenanalyse und Vorbereitung Premium"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80" />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/30 to-transparent opacity-50" />

                <div className="absolute top-8 left-8 right-8 flex items-start justify-between z-10">
                  <Badge className="bg-white/95 text-slate-800 font-bold border-none shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md px-4 py-2 rounded-full text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" /> DSGVO Konform
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Lead Capture Section */}
        <section id="kontakt" className="bg-white py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute top-0 left-0 -ml-40 -mt-40 w-[600px] h-[600px] rounded-full bg-slate-50 blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="grid gap-16 lg:gap-24 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5">
                <Badge variant="outline" className="mb-6 border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-wider text-xs px-4 py-1.5 rounded-full">
                  Diskrete Kontaktaufnahme
                </Badge>
                <h3 className={`${displayFont.className} text-4xl font-bold md:text-5xl leading-tight text-slate-900 mb-6`}>
                  Starten Sie <span className="text-blue-600">jetzt.</span>
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed mb-10">
                  Nutzen Sie unser kostenfreies Erstgespräch, um Ihre Situation fachlich zu bewerten. Ohne Verpflichtungen, mit voller Transparenz.
                </p>
                <div className="space-y-6 bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                  <div className="flex items-center gap-5 text-slate-700 font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span>Kostenlose Ersteinschätzung</span>
                  </div>
                  <div className="flex items-center gap-5 text-slate-700 font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span>Strikte Vertraulichkeit (DSGVO)</span>
                  </div>
                  <div className="flex items-center gap-5 text-slate-700 font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span>Rückmeldung innerhalb von 24h</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-[2.5rem] border border-slate-200/60 bg-white p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                  <form className="space-y-6 relative z-10" onSubmit={onSubmit}>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Vorname</label>
                        <Input
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-14 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-none font-medium rounded-xl transition-all"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nachname</label>
                        <Input
                          placeholder="Mustermann"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-14 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-none font-medium rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">E-Mail Adresse</label>
                        <Input
                          type="email"
                          placeholder="mail@beispiel.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-14 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-none font-medium rounded-xl transition-all"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Telefonnummer</label>
                        <Input
                          type="tel"
                          placeholder="+49 123 45678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="h-14 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-none font-medium rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Kurzbeschreibung Ihres Falls (Optional)</label>
                      <Textarea
                        placeholder="Was wurde Ihnen vorgeworfen?"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows={4}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-none font-medium resize-none rounded-xl transition-all p-4"
                      />
                    </div>

                    <label className="flex items-start gap-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 px-5 py-4 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={privacyConsent}
                        onChange={(e) => setPrivacyConsent(e.target.checked)}
                        required
                        className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="leading-relaxed">
                        Ich habe die <Link href="/datenschutz" className="font-semibold text-slate-700 underline hover:text-blue-600 transition-colors">Datenschutzerklärung</Link> gelesen und stimme der Verarbeitung meiner Daten zur Kontaktaufnahme zu.
                      </span>
                    </label>

                    <Button
                      type="submit"
                      disabled={submitting || !privacyConsent}
                      className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white shadow-[0_4px_15px_rgba(37,99,235,0.2)] hover:bg-blue-500 hover:shadow-[0_8px_25px_rgba(37,99,235,0.3)] transition-all duration-300 mt-4"
                    >
                      {submitting ? 'Wird übermittelt...' : 'Beratung jetzt anfordern'}
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-6 font-medium">
                      Sichere Datenübertragung • <Link href="/impressum" className="underline hover:text-slate-800">Impressum</Link> • <Link href="/datenschutz" className="underline hover:text-slate-800">Datenschutz</Link>
                    </p>

                    {submitted && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mt-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-emerald-800">
                          <CheckCircle2 className="h-6 w-6 shrink-0" />
                          <p className="font-bold">Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze!</p>
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 mt-6 animate-in fade-in zoom-in-95">
                        <div className="font-bold text-red-700 flex items-center gap-2">
                          <div className="h-6 w-6 shrink-0 bg-red-100 text-red-600 rounded-full flex items-center justify-center">!</div>
                          {error}
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 border-t border-white/10 py-16 text-slate-400 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[80px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid gap-12 md:grid-cols-4 items-start pb-12 border-b border-white/10">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="inline-block mb-6 group">
                <h1 className={`${displayFont.className} text-2xl font-bold tracking-tight text-white transition-transform group-hover:scale-[1.02]`}>
                  MPU <span className="text-blue-500">Focus</span>
                </h1>
              </Link>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                Professionelle und systematische MPU-Vorbereitung für Ihren Erfolg. Diskret, fundiert und zielorientiert – wir begleiten Sie auf dem Weg zurück zum Führerschein.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Informationen</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="#vorteile" className="hover:text-blue-400 transition-colors">Warum MPU Focus?</Link></li>
                <li><Link href="#leistungen" className="hover:text-blue-400 transition-colors">Leistungen</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Rechtliches</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="/impressum" className="hover:text-blue-400 transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-blue-400 transition-colors">Datenschutz</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm font-medium text-slate-500">© {new Date().getFullYear()} MPU Focus. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 tracking-wider">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              SECURE SYSTEM ONLINE
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
