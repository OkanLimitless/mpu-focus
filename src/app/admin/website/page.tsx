import { redirect } from 'next/navigation'
import { assertAdminRequest } from '@/lib/admin-auth'
import { resolveWebsitePage } from '@/lib/website-content'

export const dynamic = 'force-dynamic'
export default async function WebsitePage({ searchParams }: { searchParams?: { page?: string } }) {
  try { await assertAdminRequest() } catch { redirect('/login') }
  redirect(`/website?page=${resolveWebsitePage(searchParams?.page)}`)
}
