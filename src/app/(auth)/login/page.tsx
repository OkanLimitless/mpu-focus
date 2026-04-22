'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { t } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: t('loginFailedTitle'),
          description: t('loginFailedDesc'),
          variant: 'destructive',
        })
      } else {
        toast({
          title: t('loginSuccessTitle'),
          description: t('redirecting'),
        })
        const session = await getSession()
        const role = session?.user?.role
        router.push(role === 'admin' ? '/admin' : '/learn')
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={cn(bodyFont.className, 'min-h-screen bg-slate-950 text-white')}>
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src="/landing-hero-consultation.png"
            alt="Diskretes Beratungsgespräch in professioneller Umgebung"
            fill
            priority
            sizes="58vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.68)_46%,rgba(2,6,23,0.22)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.24)_0%,rgba(2,6,23,0.12)_44%,rgba(2,6,23,0.88)_100%)]" />

          <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14">
            <Link href="/" className="flex w-fit items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={cn(displayFont.className, 'text-2xl font-bold tracking-tight')}>
                MPU <span className="text-blue-400">Focus</span>
              </span>
            </Link>

            <div className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
                Sicherer Zugang
              </p>
              <h1 className={cn(displayFont.className, 'text-5xl font-bold leading-tight tracking-tight xl:text-6xl')}>
                Ihr Weg zurück. Wir begleiten Sie.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-200">
                Persönliche Vorbereitung, klare Lernschritte und Zugriff auf die Akademie nach
                individueller Freigabe.
              </p>
            </div>

            <div className="w-fit rounded-xl border border-white/10 bg-white/10 p-4 pr-8 shadow-2xl shadow-slate-950/30 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Ihre Daten sind geschützt.</p>
                  <p className="mt-1 text-xs font-medium text-slate-300">Zugang nur für freigeschaltete Nutzer.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-start justify-center overflow-hidden px-5 py-8 sm:px-8 lg:items-center lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(14,165,233,0.12),transparent_30%),#020617]" />
          <div className="absolute inset-x-0 top-0 h-28 border-b border-white/10 bg-white/[0.03] backdrop-blur-sm lg:hidden" />

          <div className="relative z-10 w-full max-w-[480px]">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={cn(displayFont.className, 'text-xl font-bold tracking-tight')}>
                  MPU Focus
                </span>
              </Link>
              <Link href="/" className="rounded-full border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white" aria-label="Zurück zur Startseite">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8 lg:border-white/[0.08] lg:bg-white/[0.04]">
              <div className="mb-8">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Geschützter Bereich
                </p>
                <h2 className={cn(displayFont.className, 'text-4xl font-bold tracking-tight text-white sm:text-5xl')}>
                  Willkommen zurück
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-300">
                  Melden Sie sich mit Ihrem freigeschalteten Konto an und setzen Sie Ihre
                  Vorbereitung fort.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-bold text-slate-200">
                    E-Mail
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={t('placeholderEmail')}
                      autoComplete="email"
                      className="h-14 rounded-lg border-white/10 bg-slate-950/55 pl-12 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="password" className="text-sm font-bold text-slate-200">
                      Passwort
                    </label>
                    <Link href="/reset-password" className="text-sm font-semibold text-blue-300 transition-colors hover:text-blue-200 hover:underline">
                      Passwort vergessen?
                    </Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={t('placeholderPassword')}
                      autoComplete="current-password"
                      className="h-14 rounded-lg border-white/10 bg-slate-950/55 pl-12 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 rounded-md p-2 -translate-y-1/2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-lg bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : 'Sicher anmelden'}
                  {!isLoading && <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />}
                </Button>
              </form>

              <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
                <p>
                  Der Zugang zur Akademie wird nach persönlicher Freigabe aktiviert.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Zur Startseite
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/datenschutz" className="transition-colors hover:text-white">
                  Datenschutz
                </Link>
                <Link href="/impressum" className="transition-colors hover:text-white">
                  Impressum
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
