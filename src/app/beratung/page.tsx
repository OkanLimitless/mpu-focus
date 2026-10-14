import { getBeratungContact } from '@/lib/beratung-contact'
import { resolveLeadRegion } from '@/lib/lead-acquisition'
import BeratungPage from '@/components/landing/BeratungPage'
import { getPublishedLandingContent } from '@/lib/landing-store'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams?: { region?: string } }) {
  return <BeratungPage contactLinks={getBeratungContact()} region={resolveLeadRegion(searchParams?.region)} content={await getPublishedLandingContent('beratung')} />
}
