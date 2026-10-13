import { redirect } from 'next/navigation'
import { assertWebsiteEditorRequest } from '@/lib/website-auth'
import { resolveWebsitePage } from '@/lib/website-content'
import LandingEditor from '@/components/landing/LandingEditor'
import EditorSignOut from '@/components/landing/EditorSignOut'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function WebsitePage({ searchParams }: { searchParams?: { page?: string } }) {
  try {
    await assertWebsiteEditorRequest()
  } catch {
    redirect('/login')
  }
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between gap-4">
      <span className="font-bold text-slate-800">MPU Focus · Website bearbeiten</span>
      <EditorSignOut />
    </div>
    <LandingEditor initialPage={resolveWebsitePage(searchParams?.page)} />
  </main>
}
