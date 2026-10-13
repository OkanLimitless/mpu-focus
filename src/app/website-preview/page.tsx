import { resolveWebsitePage } from '@/lib/website-content'
import { redirect } from 'next/navigation'
import { assertWebsiteEditorRequest } from '@/lib/website-auth'
import LandingPreview from '@/components/landing/LandingPreview'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function PreviewPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  try {
    await assertWebsiteEditorRequest()
  } catch {
    redirect('/login')
  }
  return <LandingPreview page={resolveWebsitePage(searchParams?.page)} />
}
