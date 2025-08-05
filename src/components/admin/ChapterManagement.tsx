'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BookOpen, Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
  isActive: boolean
  videoCount?: number
  createdAt: Date
}

export default function ChapterManagement() {
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterData | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1
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
          title: 'Error',
          description: data.error || 'Failed to fetch chapters',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Chapter title is required',
        variant: 'destructive',
      })
      setFormLoading(false)
      return
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Chapter description is required',
        variant: 'destructive',
      })
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
        toast({
          title: 'Success',
          description: `Chapter ${editingChapter ? 'updated' : 'created'} successfully`,
        })
        setDialogOpen(false)
        resetForm()
        fetchChapters()
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${editingChapter ? 'update' : 'create'} chapter`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      order: chapters.length + 1
    })
    setEditingChapter(null)
  }

  const handleEdit = (chapter: ChapterData) => {
    setEditingChapter(chapter)
    setFormData({
      title: chapter.title,
      description: chapter.description,
      order: chapter.order
    })
    setDialogOpen(true)
  }

  const handleDelete = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter? This will also affect any videos assigned to it.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chapter deleted successfully',
        })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete chapter',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const moveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chapter order updated',
        })
        fetchChapters()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to reorder chapter',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chapter Management</CardTitle>
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
            Chapter Management
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Chapter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
                </DialogTitle>
                <DialogDescription>
                  Create and organize course chapters. Videos will be assigned to chapters separately.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Chapter Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Introduction to Traffic Psychology"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this chapter covers..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Chapter Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                  <p className="text-xs text-gray-500">
                    Chapters will be presented to students in this order
                  </p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? 'Saving...' : (editingChapter ? 'Update Chapter' : 'Create Chapter')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Create and organize course chapters. Students will progress through chapters sequentially.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chapters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No chapters found. Create your first chapter to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chapters.map((chapter, index) => (
              <div key={chapter._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                        Chapter {chapter.order}
                      </span>
                      <h3 className="font-medium">{chapter.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{chapter.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{chapter.videoCount || 0} videos</span>
                      <span>Created: {new Date(chapter.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => moveChapter(chapter._id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => moveChapter(chapter._id, 'down')}
                      disabled={index === chapters.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(chapter)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(chapter._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}