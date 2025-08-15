'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ChevronRight } from 'lucide-react'

interface VideoData { _id: string; progress?: { isCompleted: boolean } | null }
interface Chapter { _id: string; title: string; description: string; order: number; videos: VideoData[] }

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }
    if (session.user.role === 'admin') { router.push('/admin'); return }
    ;(async () => {
      try {
        const details = await fetch('/api/user/details')
        const d = details.ok ? await details.json() : null
        if (!d?.user || d.user.verificationStatus !== 'verified') { router.push('/dashboard'); return }
        const res = await fetch('/api/course')
        if (res.ok) {
          const data = await res.json()
          const mod = (data.modules || []).find((m: any) => m.key === category)
          setLabel(mod?.label || '')
          setChapters(mod?.chapters || [])
        }
      } finally { setLoading(false) }
    })()
  }, [session, status, router, category])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{label}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chapters.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>
                  </div>
                  <Button onClick={() => router.push(`/learn/${category}/${c._id}`)} variant="outline">
                    Öffnen <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}