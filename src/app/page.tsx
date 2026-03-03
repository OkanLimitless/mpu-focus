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
    <div className={`min-h-screen bg-white text-slate-900 selection:bg-primary/30 selection:text-primary`}>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:py-5">
          <Link href="/" className="flex items-center flex-shrink-0 gap-3 group">
            <div className="bg-primary p-2 rounded-lg text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className={`text-xl font-extrabold tracking-tight text-primary`}>
              MPU Focus
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-lg px-5 py-2.5 transition-all shadow-lg shadow-primary/20"
                onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Gratis Erstgespräch
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-900 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`md:hidden absolute top-full left-0 w-full overflow-hidden transition-all duration-300 bg-white border-b border-slate-200 shadow-xl ${mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-semibold text-slate-600 hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 mt-2">
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Gratis Erstgespräch
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Bright Corporate Hero Section */}
        <section className="bg-background-light pt-32 lg:pt-48 pb-24 lg:pb-32 overflow-hidden border-b border-slate-200 relative">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left Content */}
              <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0 z-10">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  98% Erfolgsquote im Erstversuch
                </div>
                <h1 className={`text-5xl font-black tracking-tight text-slate-900 md:text-6xl lg:text-[4rem] leading-[1.1] mb-8`}>
                  Ihr sicherer Weg zurück zum <span className="text-primary">Führerschein</span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl font-medium max-w-lg mx-auto lg:mx-0">
                  Professionelle MPU-Vorbereitung: Individuell, diskret und erfolgsorientiert. Wir begleiten Sie mit psychologischer Expertise Schritt für Schritt zurück zu Ihrer Mobilität.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Button
                    size="lg"
                    className="h-14 w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 px-8 text-base font-bold text-white transition-all shadow-xl shadow-primary/25"
                    onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Kostenloses Erstgespräch
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full sm:w-auto rounded-xl px-8 text-base font-bold border-slate-300 text-slate-900 hover:bg-slate-50 transition-all"
                    onClick={() => document.getElementById('ablauf')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Mehr erfahren
                  </Button>
                </div>
              </div>

              {/* Right Image Container */}
              <div className="relative">
                <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white aspect-square md:aspect-auto md:h-[500px]">
                  <Image
                    src="/mpu-hero-split.png"
                    alt="Professional Consultant"
                    fill
                    className="object-cover object-center lg:object-left"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="vorteile" className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-slate-900">Warum MPU Focus?</h2>
              <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed text-lg">
                Unsere Expertise ist Ihr Erfolg. Wir bereiten Sie gezielt auf das psychologische Gespräch vor und nehmen Ihnen die Angst vor dem Termin.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Fachliche Expertise', desc: 'Profitieren Sie von langjähriger Erfahrung in der Verkehrspsychologie und fundiertem Wissen über aktuelle MPU-Kriterien.', icon: Users },
                { title: 'Individuelle Analyse', desc: 'Keine Standard-Lösungen. Wir entwickeln eine maßgeschneiderte Strategie für Ihre spezifische Fragestellung und Lebenssituation.', icon: Star },
                { title: 'Realistische Simulation', desc: 'Wir simulieren das MPU-Gespräch unter realen Bedingungen, damit Sie am entscheidenden Tag souverän und vorbereitet auftreten.', icon: ShieldCheck }
              ].map((feat, i) => (
                <div key={i} className="p-8 rounded-2xl border border-slate-200 bg-background-light hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                    <feat.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-slate-900">{feat.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="py-16 bg-primary text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-black mb-2">4.9/5</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Kundenzufriedenheit</div>
              </div>
              <div>
                <div className="text-4xl font-black mb-2">100%</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Diskretion</div>
              </div>
              <div>
                <div className="text-4xl font-black mb-2">Zertifiziert</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Expertenteam</div>
              </div>
              <div>
                <div className="text-4xl font-black mb-2">98%</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Erfolgsquote</div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Lead Capture Section */}
        <section id="kontakt" className="py-24 bg-background-light relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-12 rounded-[2.5rem] overflow-hidden shadow-2xl">
              {/* Left Blue Panel */}
              <div className="lg:col-span-5 bg-primary p-12 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10 mb-12">
                  <h3 className="text-4xl font-black mb-4">Starten Sie jetzt.</h3>
                  <p className="text-white/80 text-lg leading-relaxed">
                    Nutzen Sie unser kostenfreies Erstgespräch, um Ihre Situation fachlich zu bewerten. Ohne Verpflichtungen, mit voller Transparenz.
                  </p>
                </div>
                <div className="space-y-6 relative z-10 mt-auto">
                  <div className="flex items-center gap-4 text-white font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span>Kostenlose Ersteinschätzung</span>
                  </div>
                  <div className="flex items-center gap-4 text-white font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span>Strikte Vertraulichkeit (DSGVO)</span>
                  </div>
                  <div className="flex items-center gap-4 text-white font-medium">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span>Rückmeldung innerhalb von 24h</span>
                  </div>
                </div>
              </div>

              {/* Right Form Panel */}
              <div className="lg:col-span-7 bg-white p-12 lg:p-16">
                <form className="space-y-6 relative z-10" onSubmit={onSubmit}>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Vorname</label>
                      <Input
                        placeholder="Max"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-14 bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 shadow-none font-medium rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Nachname</label>
                      <Input
                        placeholder="Mustermann"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-14 bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 shadow-none font-medium rounded-xl transition-all"
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
                        className="h-14 bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 shadow-none font-medium rounded-xl transition-all"
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
                        className="h-14 bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 shadow-none font-medium rounded-xl transition-all"
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
                      className="bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 shadow-none font-medium resize-none rounded-xl transition-all p-4"
                    />
                  </div>

                  <label className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      required
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="leading-relaxed">
                      Ich habe die <Link href="/datenschutz" className="font-semibold text-slate-700 underline hover:text-primary transition-colors">Datenschutzerklärung</Link> gelesen und stimme der Verarbeitung meiner Daten zur Kontaktaufnahme zu.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    disabled={submitting || !privacyConsent}
                    className="h-14 w-full rounded-xl bg-primary text-lg font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all duration-300 mt-4"
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
        </section>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-16 text-slate-400 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid gap-12 md:grid-cols-4 items-start pb-12 border-b border-slate-800">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="inline-block mb-6 group flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white transition-transform group-hover:scale-[1.02]">
                  MPU Focus
                </h1>
              </Link>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                Professionelle und systematische MPU-Vorbereitung für Ihren Erfolg. Diskret, fundiert und zielorientiert.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Informationen</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="#vorteile" className="hover:text-primary transition-colors">Warum MPU Focus?</Link></li>
                <li><Link href="#leistungen" className="hover:text-primary transition-colors">Leistungen</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Rechtliches</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-primary transition-colors">Datenschutz</Link></li>
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
