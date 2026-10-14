import { resolveWebsitePage } from '@/lib/website-content'
import { notFound } from 'next/navigation'
import LandingPreview from '@/components/landing/LandingPreview'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default function DemoPreviewPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <LandingPreview page={resolveWebsitePage(searchParams?.page)} />
}
