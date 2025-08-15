'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react'

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

  const completedCount = useMemo(() => {
    return chapters.reduce((acc, c) => acc + (c.videos.length > 0 && c.videos.every(v => v.progress?.isCompleted), 0), 0)
  }, [chapters])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => router.push('/learn')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
          <div className="text-sm text-gray-600">{chapters.length} Module</div>
        </div>
        <h1 className="text-3xl font-bold mb-2">{label}</h1>
        <p className="text-gray-600 mb-6">Wähle ein Modul aus, um zu starten.</p>
        <Card>
          <CardHeader>
            <CardTitle>Module</CardTitle>
            <CardDescription>
              {/* Optional progress summary */}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chapters.map((c) => {
                const total = c.videos.length
                const done = c.videos.filter(v => v.progress?.isCompleted).length
                const isCompleted = total > 0 && done === total
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={c._id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{c.title}</div>
                        {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{pct}%</span>
                      <Button onClick={() => router.push(`/learn/${category}/${c._id}`)} variant="outline">
                        Öffnen <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}