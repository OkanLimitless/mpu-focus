'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Video, Upload, Play, Edit, Trash2, Plus, Eye, ExternalLink } from 'lucide-react'

interface VideoData {
  _id: string
  title: string
  description: string
  muxAssetId?: string
  muxPlaybackId?: string
  duration: number
  order: number
  isActive: boolean
  chapterId: string
  chapterTitle?: string
  status?: string
  createdAt: Date
}

interface ChapterData {
  _id: string
  title: string
  description: string
  order: number
}

export default function VideoManagement() {
  const [videos, setVideos] = useState<VideoData[]>([])
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoData | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    muxAssetId: '',
    order: 1,
    chapterId: ''
  })

  useEffect(() => {
    fetchVideos()
    fetchChapters()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/admin/videos')
      const data = await response.json()
      if (response.ok) {
        setVideos(data.videos)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch videos',
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

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      if (response.ok) {
        setChapters(data.chapters)
      } else {
        console.error('Failed to fetch chapters:', data.error)
      }
    } catch (error) {
      console.error('Error fetching chapters:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    // Additional validation
    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      })
      setFormLoading(false)
      return
    }

    if (!formData.chapterId) {
      toast({
        title: 'Error',
        description: 'Please select a chapter',
        variant: 'destructive',
      })
      setFormLoading(false)
      return
    }

    try {
      const url = editingVideo ? `/api/admin/videos/${editingVideo._id}` : '/api/admin/videos'
      const method = editingVideo ? 'PUT' : 'POST'

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
          description: `Video ${editingVideo ? 'updated' : 'created'} successfully`,
        })
        setDialogOpen(false)
        resetForm()
        fetchVideos()
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${editingVideo ? 'update' : 'create'} video`,
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
      muxAssetId: '',
      order: 1,
      chapterId: ''
    })
    setEditingVideo(null)
  }

  const handleEdit = (video: VideoData) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description,
      muxAssetId: video.muxAssetId || '',
      order: video.order,
      chapterId: video.chapterId
    })
    setDialogOpen(true)
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Video deleted successfully',
        })
        fetchVideos()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete video',
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

  const syncMuxAsset = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/sync-mux`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Mux asset synced successfully',
        })
        fetchVideos()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to sync Mux asset',
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

  const getStatusBadge = (video: VideoData) => {
    if (!video.muxAssetId) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No Mux Asset</span>
    }
    if (video.status === 'ready') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Ready</span>
    }
    if (video.status === 'preparing') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Processing</span>
    }
    return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Unknown</span>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video Management</CardTitle>
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
            <Video className="h-5 w-5" />
            Video Management
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingVideo ? 'Edit Video' : 'Add New Video'}
                </DialogTitle>
                <DialogDescription>
                  {editingVideo ? 'Update video information and Mux integration.' : 'Create a new video and connect it to your Mux asset.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Video Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter video title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter video description"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="muxAssetId">Mux Asset ID</Label>
                  <Input
                    id="muxAssetId"
                    value={formData.muxAssetId}
                    onChange={(e) => setFormData(prev => ({ ...prev, muxAssetId: e.target.value }))}
                    placeholder="Enter Mux Asset ID (from Mux dashboard)"
                  />
                  <p className="text-xs text-gray-500">
                    Find this in your Mux dashboard under Assets. It looks like: abcd1234efgh5678
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chapterId">Chapter</Label>
                    <Select
                      value={formData.chapterId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, chapterId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((chapter) => (
                          <SelectItem key={chapter._id} value={chapter._id}>
                            {chapter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? 'Saving...' : (editingVideo ? 'Update Video' : 'Create Video')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage course videos and their Mux integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos found. Create your first video to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div key={video._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{video.title}</h3>
                      {getStatusBadge(video)}
                    </div>
                    <p className="text-sm text-gray-600">{video.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Order: {video.order}</span>
                      {video.duration > 0 && <span>Duration: {Math.round(video.duration)}s</span>}
                      {video.muxAssetId && (
                        <span className="flex items-center gap-1">
                          Mux: {video.muxAssetId}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {video.muxPlaybackId && (
                      <Button size="sm" variant="outline" asChild>
                        <a 
                          href={`https://stream.mux.com/${video.muxPlaybackId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {video.muxAssetId && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => syncMuxAsset(video._id)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(video)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(video._id)}
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