import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAcademyAccess, requireSession } from '@/lib/auth-helpers'
import LearnClient from './LearnClient'

export default async function LearnPage() {
  const sessionRes = await requireSession()
  if (!sessionRes.ok) {
    redirect('/login')
  }

  const access = await requireAcademyAccess()
  if (!access.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Akademie noch nicht freigeschaltet</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Ihr Konto ist angemeldet, aber noch nicht für den Kursbereich freigegeben.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-200">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zur Startseite
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/login">Anderes Konto verwenden</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <LearnClient />
}
