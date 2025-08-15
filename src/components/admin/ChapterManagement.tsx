'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BookOpen, Plus, Edit, Trash2, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
  isActive: boolean
  videoCount?: number
  moduleKey?: string
  createdAt: Date
}

const MODULE_OPTIONS = [
  { key: 'alcohol_drugs', label: 'Lernvideos Alkohol & Drogen' },
  { key: 'traffic_points', label: 'Lernvideos Verkehr­sauffälligkeiten (Punkte in Flensburg)' },
  { key: 'medicinal_cannabis', label: 'Lernvideos Medizinalcannabis' },
  { key: 'extras', label: 'Zusatzvideos' },
]

export default function ChapterManagement() {
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterData | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useI18n()

  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    moduleKey: MODULE_OPTIONS[0].key,
  })

  useEffect(() => {
    fetchChapters()
  }, [])

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      if (response.ok) {
        setChapters(data.chapters)
      } else {
        toast({
          title: t('error'),
          description: data.error || t('unexpectedError'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('unexpectedError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredChapters = selectedModuleKey
    ? chapters.filter((c) => c.moduleKey === selectedModuleKey)
    : chapters

  const getModuleLabel = (key: string) => MODULE_OPTIONS.find((m) => m.key === key)?.label || key

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    if (!formData.title.trim() || !formData.description.trim() || !formData.moduleKey) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
      setFormLoading(false)
      return
    }

    try {
      const url = editingChapter ? `/api/admin/chapters/${editingChapter._id}` : '/api/admin/chapters'
      const method = editingChapter ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: t('success'), description: `${t('chapterManagement')} ${editingChapter ? t('update') : t('create')} ${t('success').toLowerCase()}` })
        setDialogOpen(false)
        resetForm()
        fetchChapters()
      } else {
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    const nextOrder = selectedModuleKey ? (filteredChapters.length + 1) : (chapters.length + 1)
    setFormData({
      title: '',
      description: '',
      order: nextOrder,
      moduleKey: selectedModuleKey || MODULE_OPTIONS[0].key,
    })
    setEditingChapter(null)
  }

  const handleEdit = (chapter: ChapterData) => {
    setEditingChapter(chapter)
    setFormData({ title: chapter.title, description: chapter.description, order: chapter.order, moduleKey: chapter.moduleKey || MODULE_OPTIONS[0].key })
    setDialogOpen(true)
  }

  const handleDelete = async (chapterId: string) => {
    if (!confirm(t('confirmDeleteVideo'))) { // reuse generic
      return
    }

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}`, { method: 'DELETE' })

      if (response.ok) {
        toast({ title: t('success'), description: t('chapterDeleted') })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  const moveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      })

      if (response.ok) {
        toast({ title: t('success'), description: t('orderUpdated') })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({ title: t('error'), description: data.error || t('unexpectedError'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('error'), description: t('unexpectedError'), variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('chapterManagement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {selectedModuleKey ? getModuleLabel(selectedModuleKey) : t('chapterManagement')}
          </div>
          <div className="flex items-center gap-2">
            {selectedModuleKey ? (
              <>
                <Button variant="outline" onClick={() => setSelectedModuleKey(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addChapter')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingChapter ? t('editChapter') : t('addNewChapter')}
                      </DialogTitle>
                      <DialogDescription>
                        {t('chaptersWillBePresented')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">{t('chapterTitle')}</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder={t('chapterTitle')} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{t('chapterDescription')}</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder={t('chapterDescription')} rows={3} required />
                      </div>

                      {/* Show category as read-only in category view */}
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <div className="w-full border rounded px-3 py-2 bg-muted text-sm">
                          {getModuleLabel(formData.moduleKey)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="order">{t('chapterOrder')}</Label>
                        <Input id="order" type="number" value={formData.order} onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))} min="1" />
                        <p className="text-xs text-gray-500">{t('chaptersWillBePresented')}</p>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={formLoading}>
                          {formLoading ? t('processing') : (editingChapter ? t('updateChapter') : t('createChapter'))}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        </CardTitle>
        <CardDescription>
          {selectedModuleKey ? t('chaptersWillBePresented') : 'Select a category to manage its modules'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedModuleKey ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULE_OPTIONS.map((m) => {
              const count = chapters.filter((c) => c.moduleKey === m.key).length
              return (
                <div key={m.key} className="border rounded-lg p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      <h3 className="font-medium">{m.label}</h3>
                    </div>
                    <p className="text-sm text-gray-600">Modules: {count}</p>
                  </div>
                  <div className="pt-3">
                    <Button className="w-full" onClick={() => {
                      setSelectedModuleKey(m.key)
                      setFormData(prev => ({ ...prev, moduleKey: m.key }))
                    }}>
                      Manage
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noChaptersFound')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChapters.map((chapter, index) => (
                  <div key={chapter._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {t('chapter')} {chapter.order}
                          </span>
                          <h3 className="font-medium">{chapter.title}</h3>
                          {chapter.moduleKey && (
                            <span className="ml-2 text-xs text-gray-500">[{chapter.moduleKey}]</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{chapter.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{t('videosCount', { count: chapter.videoCount || 0 })}</span>
                          <span>{t('createdLabel')}: {new Date(chapter.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => moveChapter(chapter._id, 'up')} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => moveChapter(chapter._id, 'down')} disabled={index === filteredChapters.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(chapter)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(chapter._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}