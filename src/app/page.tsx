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
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
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
      // Reset form
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
    <div className={`${bodyFont.className} min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-100 selection:text-orange-900`}>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-32 transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="MPU Focus Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition-colors hover:text-orange-400"
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5">Login</Button>
              </Link>
              <Button
                size="sm"
                className="bg-orange-500 font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Jetzt starten
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-white/5 bg-slate-900 p-6 md:hidden animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-slate-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">Login</Button>
                </Link>
                <Button
                  className="w-full bg-orange-500 text-white font-bold"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Kostenlose Beratung
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative bg-white py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
            <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="max-w-xl animate-in fade-in slide-in-from-left-6 duration-700">
                <Badge variant="outline" className="mb-6 border-orange-200 bg-orange-50 py-1 text-orange-700 font-bold px-4 rounded-full uppercase tracking-wider text-[10px]">
                  92% Erfolgsquote im ersten Anlauf
                </Badge>
                <h1 className={`${displayFont.className} text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-7xl`}>
                  Ihren Führerschein <br />
                  <span className="text-blue-700">sicher zurück.</span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl">
                  Bestehen Sie die MPU ohne Stress. Professionelle und diskrete Vorbereitung von Experten. Wir begleiten Sie individuell bis zum positiven Gutachten.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Button
                    size="lg"
                    className="h-14 rounded-2xl bg-orange-500 px-8 text-lg font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all hover:scale-105 text-white"
                    onClick={() => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Kostenlose Erstberatung
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3 items-center">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden ring-2 ring-blue-50/50">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 42}`}
                            alt="User Profile"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex gap-0.5 mb-0.5">
                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                      </div>
                      <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">4.9/5 | 500+ Beratungen</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] rounded-[2.5rem] bg-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-200">
                <Image
                  src="/mpu-hero.png"
                  alt="Professionelle MPU Beratung"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">TÜV/DEKRA Konform</p>
                      <p className="text-xl font-bold text-white uppercase tracking-tight">MPU-Vorbereitung 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Trust Section */}
        <section id="vorteile" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className={`${displayFont.className} text-3xl font-bold md:text-5xl`}>Warum MPU Focus?</h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Wir wissen, worauf es ankommt. Unser Ziel ist nicht nur das Bestehen, sondern Ihre nachhaltige Mobilität.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Star className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold">Experten-Wissen</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Profitieren Sie von über 10 Jahren Erfahrung und Experten, die die Anforderungen der Gutachter genau kennen.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold">100% Diskretion</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Wir behandeln Ihren Fall absolut vertraulich und begleiten Sie ohne Vorurteile durch den gesamten Prozess.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold">Individuell & Flexibel</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Keine Massenabfertigung. Wir erstellen einen maßgeschneiderten Plan, der perfekt in Ihren Alltag passt.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="leistungen" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className={`${displayFont.className} text-3xl font-bold md:text-5xl leading-tight`}>
                  Gezielte Hilfe für <br />
                  <span className="text-orange-500">Ihren spezifischen Fall.</span>
                </h2>
                <div className="mt-10 space-y-8">
                  <div className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Alkohol-MPU</h4>
                      <p className="mt-2 text-slate-600">Systematische Aufarbeitung und Strategien zur Verhaltensänderung bei Alkoholdelikten.</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-orange-500">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Drogen-MPU</h4>
                      <p className="mt-2 text-slate-600">Begleitung bei der Abstinenzbelegung und Vorbereitung auf das psychologische Gespräch.</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Punkte-MPU</h4>
                      <p className="mt-2 text-slate-600">Analyse von Verhaltensmustern und Aufbau einer positiven Perspektive für den Straßenverkehr.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-blue-100 to-orange-100 blur-2xl opacity-50" />
                <div className="relative grid gap-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-right-8 duration-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-500 p-2.5 text-white">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <span className="font-bold">Zertifikat erhalten</span>
                      </div>
                      <span className="text-sm font-medium text-slate-400">Vor 2 Min.</span>
                    </div>
                  </div>
                  <div className="ml-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 p-2.5 text-white">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <span className="font-bold">Beratung abgeschlossen</span>
                      </div>
                      <span className="text-sm font-medium text-slate-400">Vor 1 Std.</span>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-800 p-2.5 text-white">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <span className="font-bold">Termin bestätigt</span>
                      </div>
                      <span className="text-sm font-medium text-slate-400">Gerade eben</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section id="ablauf" className="bg-slate-900 py-24 text-white rounded-[4rem] mx-4 mb-24 overflow-hidden relative shadow-2xl shadow-blue-900/10">
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-orange-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/10 blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
            <h2 className={`${displayFont.className} text-3xl font-bold md:text-5xl`}>In 3 Schritten zurück zum Schein</h2>
            <div className="mt-20 grid gap-12 md:grid-cols-3 relative">
              <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-px bg-white/20 z-0" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900 text-xl font-bold shadow-xl shadow-white/10 ring-8 ring-white/5">1</div>
                <h4 className="mt-8 text-xl font-bold">Kostenlose Beratung</h4>
                <p className="mt-3 text-emerald-50/70 text-sm leading-relaxed max-w-[240px]">In einem ersten Telefonat analysieren wir Ihren Fall und klären alle Fragen.</p>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white text-xl font-bold shadow-xl shadow-orange-500/20 ring-8 ring-orange-500/5">2</div>
                <h4 className="mt-8 text-xl font-bold">Gezielte Vorbereitung</h4>
                <p className="mt-3 text-orange-50/70 text-sm leading-relaxed max-w-[240px]">Einzelberatungen, Aufarbeitung und strategische Gutachter-Simulation.</p>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white text-xl font-bold shadow-xl shadow-blue-600/20 ring-8 ring-blue-600/5">3</div>
                <h4 className="mt-8 text-xl font-bold">MPU bestehen</h4>
                <p className="mt-3 text-blue-50/70 text-sm leading-relaxed max-w-[240px]">Mit Sicherheit und Selbstbewusstsein in das Gespräch gehen und den Führerschein zurückerhalten.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className={`${displayFont.className} text-3xl font-bold text-center mb-16`}>Häufig gestellte Fragen</h2>
            <div className="space-y-6">
              {[
                { q: "Wie lange dauert eine MPU-Vorbereitung?", a: "Das hängt stark von Ihrem individuellen Fall und den Delikten ab. Im Durchschnitt planen wir 3 bis 6 Monate ein, um eine fundierte Verhaltensänderung zu erarbeiten." },
                { q: "Benötige ich zwingend einen Abstinenzbeleg?", a: "Nicht in jedem Fall. Dies klären wir detailliert in der Erstberatung unter Berücksichtigung der aktuellen Beurteilungskriterien." },
                { q: "Was kostet die Vorbereitung?", a: "Wir bieten transparente Festpreise an, die sich nach dem Umfang der notwendigen Beratung richten. Ein Angebot erhalten Sie nach dem kostenlosen Erstgespräch." }
              ].map((faq, i) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    <HelpCircle className="h-6 w-6 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold">{faq.q}</h4>
                      <p className="mt-2 text-slate-600 leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead Capture Section */}
        <section id="kontakt" className="relative bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 md:p-16 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:32px_32px]" />

              <div className="grid gap-16 lg:grid-cols-2 relative z-10">
                <div>
                  <h2 className={`${displayFont.className} text-4xl font-bold md:text-5xl leading-tight`}>
                    Der erste Schritt <br />
                    <span className="text-orange-400 underline decoration-white/20 underline-offset-8">zurück zum Schein.</span>
                  </h2>
                  <p className="mt-8 text-xl text-orange-50/80 leading-relaxed">
                    Hinterlassen Sie uns Ihre Daten. Wir rufen Sie innerhalb von 24 Stunden für eine kostenlose, unverbindliche Erstberatung zurück.
                  </p>
                  <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-medium">100% Kostenlos & Unverbindlich</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-medium">Datenschutzkonform & Diskret</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-medium">Sofortiger Rückruf garantiert</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2.5rem] bg-white p-8 md:p-10 shadow-3xl text-slate-900">
                  <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold ml-1">Vorname</label>
                        <Input
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold ml-1">Nachname</label>
                        <Input
                          placeholder="Mustermann"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold ml-1">E-Mail Adresse</label>
                      <Input
                        type="email"
                        placeholder="max@beispiel.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold ml-1">Telefonnummer</label>
                      <Input
                        type="tel"
                        placeholder="+49 123 456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold ml-1">Ihre Nachricht (optional)</label>
                      <Textarea
                        placeholder="Kurze Schilderung Ihres Falls..."
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows={3}
                        className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-none resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-14 w-full rounded-2xl bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:scale-[1.02] transition-all"
                    >
                      {submitting ? 'Wird gesendet...' : 'Jetzt Beratung anfordern'}
                    </Button>

                    <p className="text-center text-xs text-slate-400 pt-2">
                      Mit der Anforderung erklären Sie sich mit unserer <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link> einverstanden.
                    </p>

                    {submitted && (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center animate-in fade-in zoom-in-95 duration-500">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-orange-600 mb-2" />
                        <p className="font-bold text-orange-800">Vielen Dank!</p>
                        <p className="text-sm text-orange-700">Wir haben Ihre Anfrage erhalten und melden uns in Kürze.</p>
                      </div>
                    )}
                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-center animate-in fade-in slide-in-from-top-2">
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

      <footer className="bg-white border-t border-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4 items-start">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="relative h-8 w-32">
                  <Image
                    src="/logo.png"
                    alt="MPU Focus Logo"
                    fill
                    className="object-contain object-left filter invert brightness-0"
                  />
                </div>
              </Link>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                Professionelle MPU-Vorbereitung für Ihren Erfolg. Wir begleiten Sie sicher und diskret durch den gesamten Prozess zurück zur Mobilität.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 mb-6">Links</h5>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><Link href="#vorteile" className="hover:text-orange-500 transition-colors">Vorteile</Link></li>
                <li><Link href="#leistungen" className="hover:text-orange-500 transition-colors">Leistungen</Link></li>
                <li><Link href="#ablauf" className="hover:text-orange-500 transition-colors">Ablauf</Link></li>
                <li><Link href="/login" className="hover:text-orange-500 transition-colors">Partner-Login</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 mb-6">Rechtliches</h5>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><Link href="/impressum" className="hover:text-orange-500 transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-orange-500 transition-colors">Datenschutz</Link></li>
                <li><Link href="/agb" className="hover:text-orange-500 transition-colors">AGB</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} MPU Focus. Alle Rechte vorbehalten.</p>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Server Status: Online
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
