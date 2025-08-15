'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ChevronRight, ArrowLeft, BookOpen } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface VideoData { _id: string; duration?: number; progress?: { isCompleted: boolean } | null }
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

  const totals = useMemo(() => {
    const totalVideos = chapters.reduce((acc, c) => acc + c.videos.length, 0)
    const completedVideos = chapters.reduce((acc, c) => acc + c.videos.filter(v => v.progress?.isCompleted).length, 0)
    const pct = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
    return { totalVideos, completedVideos, pct }
  }, [chapters])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-6xl mx-auto px-4 py-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm/6 opacity-80">MPU Focus Campus</div>
              <h1 className="text-2xl md:text-3xl font-bold">{label}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {chapters.length} Module</div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-40"><Progress value={totals.pct} /></div>
                  <span className="text-white/90">{totals.completedVideos}/{totals.totalVideos} Lektionen</span>
                </div>
              </div>
            </div>
            <Button variant="secondary" onClick={() => router.push('/learn')} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary for small screens */}
        <div className="md:hidden mb-6 flex items-center gap-3">
          <div className="flex-1"><Progress value={totals.pct} /></div>
          <span className="text-sm text-gray-600 whitespace-nowrap">{totals.completedVideos}/{totals.totalVideos} Lektionen</span>
        </div>

        {/* Modules List */}
        <Card>
          <CardHeader>
            <CardTitle>Module</CardTitle>
            <CardDescription>Wähle ein Modul aus, um fortzufahren.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chapters.map((c) => {
                const total = c.videos.length
                const done = c.videos.filter(v => v.progress?.isCompleted).length
                const isCompleted = total > 0 && done === total
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={c._id} className="p-4 border rounded-lg bg-white flex items-center justify-between">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{c.title}</div>
                        {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">{c.description}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-40 hidden sm:block"><Progress value={pct} /></div>
                        <span>{done}/{total} Lektionen</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={() => router.push(`/learn/${category}/${c._id}`)} variant="outline">
                        {isCompleted ? 'Erneut starten' : (done > 0 ? 'Weiter' : 'Starten')} <ChevronRight className="h-4 w-4 ml-1" />
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