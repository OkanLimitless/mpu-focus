import { resolveWebsitePage } from '@/lib/website-content'
import { notFound } from 'next/navigation'
import LandingEditor from '@/components/landing/LandingEditor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default function EditorDemoPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <main className="min-h-screen bg-[#f6f8fb] p-4 md:p-8">
      <LandingEditor
        demo
        initialPage={resolveWebsitePage(searchParams?.page)}
      />
    </main>
  )
}
