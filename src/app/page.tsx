import LandingPage from '@/components/landing/LandingPage'
import { getPublishedLandingContent } from '@/lib/landing-store'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  return <LandingPage content={await getPublishedLandingContent()} />
}
