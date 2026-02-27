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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className={`${bodyFont.className} min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900`}>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center flex-shrink-0">
            <h1 className={`${displayFont.className} text-xl font-bold tracking-tight text-slate-900`}>
              MPU <span className="text-blue-600">Focus</span>
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <Button
                size="sm"
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700 rounded-lg px-5 shadow-sm"
                onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Kostenlose Erstberatung
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white p-6 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-semibold text-slate-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 mt-2">
                <Button
                  className="w-full bg-blue-600 text-white font-semibold"
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
        )}
      </nav>

      <main className="pt-24 md:pt-32">
        {/* Solid Hero Section */}
        <section className="bg-slate-50 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="mb-6 border-blue-200 bg-blue-50 py-1 px-4 text-blue-700 font-bold rounded-full uppercase tracking-wider text-xs shadow-sm">
                Zertifizierte Vorbereitung 2026
              </Badge>
              <h2 className={`${displayFont.className} text-5xl font-bold tracking-tight text-slate-900 md:text-7xl lg:leading-[1.1] mb-8`}>
                Ihr schnellster Weg <br className="hidden md:block" /> zurück zum <span className="text-blue-600">Führerschein.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl font-medium">
                Professionelle MPU-Vorbereitung mit nachweislich 92% Erfolgsquote. Diskret, fundiert und zielorientiert – wir bereiten Sie optimal auf den Gutachter vor.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="h-14 w-full sm:w-auto rounded-xl bg-blue-600 px-8 text-lg font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
                  onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Erstgespräch vereinbaren
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full sm:w-auto rounded-xl px-8 text-lg font-bold border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                  onClick={() => document.getElementById('ablauf')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Mehr erfahren
                </Button>
              </div>

              {/* Minimal Trust Indicator */}
              <div className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-8 py-8 border-y border-slate-200">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="font-bold text-slate-900">4.9/5 Bewertung</span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-slate-900">Über 500 Erfolgsfälle</span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-slate-900">Völlige Diskretion</span>
                </div>
              </div>
            </div>

            {/* Premium Hero Validation Image */}
            <div className="mt-16 sm:mt-24 mx-auto max-w-6xl relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <div className="absolute inset-x-20 top-0 bg-blue-500 blur-[120px] h-full opacity-20 pointer-events-none" />
              <div className="relative aspect-video rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/50 bg-slate-100 group">
                <Image
                  src="/mpu-success.png"
                  alt="MPU Erfolg"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />

                <div className="absolute bottom-8 left-8 right-8 flex justify-center">
                  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between p-4 sm:px-8 max-w-2xl w-full text-white shadow-2xl">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Status</p>
                      <p className="text-lg font-bold">Gutachten positiv abgeschlossen.</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Features Section */}
        <section id="vorteile" className="bg-white py-24 border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 md:flex justify-between items-end">
              <div className="max-w-2xl">
                <h3 className={`${displayFont.className} text-3xl font-bold md:text-5xl tracking-tight`}>Expertise, der Sie vertrauen können.</h3>
                <p className="mt-4 text-slate-600 text-lg">Ein positives Gutachten ist kein Zufall, sondern das Ergebnis solider Aufarbeitung.</p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: 'Tiefgehende Analyse', desc: 'Präzise Aufarbeitung Ihrer individuellen Situation. Wir decken die Kernthemen auf, die der Gutachter erwartet.', icon: Users },
                { title: 'Gutachter-Simulation', desc: 'Realitätsnahe Gesprächstrainings bereiten Sie auf Stresssituationen vor und bauen Ängste effektiv ab.', icon: ShieldCheck },
                { title: 'Rechtssichere Prozesse', desc: 'Unsere methodische Vorbereitung ist konform mit den aktuellen Beurteilungskriterien (Beurteilungskriterien 4. Auflage).', icon: CheckCircle2 }
              ].map((feat, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-8 hover:border-blue-300 transition-colors bg-slate-50">
                  <feat.icon className="h-8 w-8 text-blue-600 mb-6" />
                  <h4 className="text-xl font-bold text-slate-900 mb-3">{feat.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solid Services Section */}
        <section id="leistungen" className="bg-slate-50 py-24 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-wider text-xs">
                  Spezialisierung
                </Badge>
                <h3 className={`${displayFont.className} text-3xl font-bold md:text-5xl leading-tight mb-6`}>
                  Maßgeschneidert auf Ihren Fall.
                </h3>
                <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                  Jede Anordnung zur MPU hat unterschiedliche Hintergründe. Wir bieten spezialisierte Vorbereitungen, die genau auf Ihre behördlichen Auflagen zugeschnitten sind.
                </p>
                <div className="space-y-6">
                  {[
                    { title: "Alkohol-Fragestellung", desc: "Begleitung bei Abstinenznachweisen und Erarbeitung von Trinkmotiven sowie Vermeidungsstrategien." },
                    { title: "Drogen-Fragestellung", desc: "Konsequente Aufarbeitung des Konsumverhaltens und Vorbereitung auf die medizinisch-toxikologischen Anforderungen." },
                    { title: "Punkte-Fragestellung", desc: "Analyse Ihrer Verkehrszuwiderhandlungen und Entwicklung von Strategien zur konsequenten Regelakzeptanz." }
                  ].map((service, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 shrink-0 p-1 bg-blue-100 rounded text-blue-700 h-6 w-6 flex items-center justify-center">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-lg">{service.title}</h5>
                        <p className="text-slate-600 mt-1">{service.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative aspect-[4/5] lg:aspect-square rounded-[2rem] bg-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-200">
                <Image
                  src="/mpu-analysis.png"
                  alt="MPU Aktenanalyse und Vorbereitung"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/40 to-transparent h-1/2" />
                <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
                  <Badge className="bg-white/90 text-slate-800 font-bold border-none shadow-sm backdrop-blur-md px-3 py-1">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-blue-600" /> DSGVO Konform
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Capture Section - Highly Professional Form */}
        <section id="kontakt" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-16 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5">
                <h3 className={`${displayFont.className} text-4xl font-bold md:text-5xl leading-tight text-slate-900 mb-6`}>
                  Starten Sie jetzt.
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  Nutzen Sie unser kostenfreies Erstgespräch, um Ihre Situation zu bewerten. Keine Verpflichtungen, volle Transparenz.
                </p>
                <div className="space-y-5">
                  <div className="flex items-center gap-4 text-slate-700 font-medium">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Kostenlose Ersteinschätzung
                  </div>
                  <div className="flex items-center gap-4 text-slate-700 font-medium">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Strikte Vertraulichkeit (DSGVO-konform)
                  </div>
                  <div className="flex items-center gap-4 text-slate-700 font-medium">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Rückmeldung innerhalb von 24h
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm">
                  <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Vorname</label>
                        <Input
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-none font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Nachname</label>
                        <Input
                          placeholder="Mustermann"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">E-Mail Adresse</label>
                        <Input
                          type="email"
                          placeholder="mail@beispiel.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-none font-medium"
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
                          className="h-12 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Kurzbeschreibung Ihres Falls (Optional)</label>
                      <Textarea
                        placeholder="Was wurde Ihnen vorgeworfen?"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows={4}
                        className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-none font-medium resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-700 transition-colors mt-2"
                    >
                      {submitting ? 'Wird übermittelt...' : 'Beratung anfordern'}
                    </Button>

                    <p className="text-center text-sm text-slate-500 mt-4">
                      Durch Absenden akzeptieren Sie unsere <Link href="/datenschutz" className="underline hover:text-slate-800">Datenschutzerklärung</Link>.
                    </p>

                    {submitted && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mt-6">
                        <div className="flex items-center gap-3 text-emerald-800">
                          <CheckCircle2 className="h-6 w-6" />
                          <p className="font-bold">Anfrage erfolgreich übermittelt. Wir melden uns in Kürze!</p>
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 mt-6">
                        <div className="font-bold text-red-700">{error}</div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-16 text-slate-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4 items-start pb-12 border-b border-slate-800">
            <div className="col-span-1 md:col-span-2">
              <h1 className={`${displayFont.className} text-xl font-bold tracking-tight text-white mb-6`}>
                MPU <span className="text-blue-500">Focus</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                Professionelle und systematische MPU-Vorbereitung für Ihren Erfolg. Diskret, fundiert und zielorientiert – wir begleiten Sie auf dem Weg zurück zum Führerschein.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Informationen</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="#vorteile" className="hover:text-blue-400 transition-colors">Vorteile</Link></li>
                <li><Link href="#leistungen" className="hover:text-blue-400 transition-colors">Leistungen</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white mb-6 tracking-wide uppercase text-xs">Rechtliches</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><Link href="/impressum" className="hover:text-blue-400 transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-blue-400 transition-colors">Datenschutz</Link></li>
                <li><Link href="/agb" className="hover:text-blue-400 transition-colors">AGB</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm font-medium text-slate-500">© {new Date().getFullYear()} MPU Focus. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 tracking-wider">
              <div className="flex items-center justify-center p-1 rounded-full bg-emerald-500/20">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              SYSTEM ONLINE
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
