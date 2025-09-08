'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { Users, Search, Eye, Edit, Trash2, BarChart3, Clock, Play, BookOpen, Mail, Shield, CheckCircle2, XCircle, AlertTriangle, FileText, Calendar, Download, Plus, StickyNote, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/components/providers/i18n-provider'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  verificationStatus?: 'pending' | 'documents_uploaded' | 'contract_signed' | 'verified' | 'rejected' | 'resubmission_required'
  passportDocument?: {
    filename?: string
    uploadedAt?: string
    status?: string
    rejectionReason?: string
  }
  contractSigned?: {
    signedAt?: string
    signatureMethod?: string
  }
  verifiedAt?: string
  verifiedBy?: string
  documentProcessing?: {
    extractedData: string
    fileName: string
    totalPages: number
    processedAt: string
    processingMethod: string
    processingNotes: string
  }
  adminNotes?: Array<{
    _id: string
    note: string
    createdBy: {
      _id: string
      firstName: string
      lastName: string
      email: string
    }
    createdAt: string
    isPrivate: boolean
  }>
  progress?: {
    totalVideos: number
    completedVideos: number
    totalChapters: number
    completedChapters: number
    averageProgress: number
    lastActivity?: string
  }
}

interface Chapter {
  _id: string
  title: string
  order: number
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  // Removed: statusFilter and verificationFilter; we now only show verified users in this view
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const { toast } = useToast()
  const { t } = useI18n()

  // Helper function to get verification status badge
  const getVerificationStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />{t('status_verified')}</Badge>
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />{t('status_pending')}</Badge>
      case 'documents_uploaded':
        return <Badge variant="info"><FileText className="w-3 h-3 mr-1" />{t('status_documents_uploaded')}</Badge>
      case 'contract_signed':
        return <Badge variant="purple"><Shield className="w-3 h-3 mr-1" />{t('underReview')}</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('status_rejected')}</Badge>
      case 'resubmission_required':
        return <Badge variant="orange"><AlertTriangle className="w-3 h-3 mr-1" />{t('status_resubmission_required')}</Badge>
      default:
        return <Badge variant="outline">{t('status_unknown')}</Badge>
    }
  }

  const [userProgress, setUserProgress] = useState<any[]>([])

  useEffect(() => {
    fetchUsers()
    fetchChapters()
  }, [])

  // Auto-select the first user in filtered list if none selected
  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUser(users[0])
    }
  }, [users, selectedUser])

  // Function to view document processing data
  const viewDocumentData = (user: User) => {
    setSelectedUser(user)
    setDocumentDialogOpen(true)
  }

  // Function to open document processor for user
  const openDocumentProcessor = (user: User) => {
    const processorUrl = `/document-processor?userId=${user._id}&userName=${encodeURIComponent(user.firstName + ' ' + user.lastName)}`
    window.open(processorUrl, '_blank')
  }

  // Function to generate PDF from stored data
  const generatePDFFromData = async (user: User) => {
    if (!user.documentProcessing?.extractedData) {
      toast({
        title: "No Data Available",
        description: "This user has no extracted document data to generate a PDF from.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGeneratingPDF(true)
      
      const response = await fetch(`/api/admin/users/${user._id}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'PDF generation failed')
      }

      const data = await response.json()
      
      if (!data.success || !data.htmlContent) {
        throw new Error('Invalid response from PDF generation service')
      }

      // Create a new window with the HTML content for PDF generation
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups and try again.')
      }

      // Write the GPT-generated HTML to the new window
      printWindow.document.write(data.htmlContent)
      printWindow.document.close()

      // Wait for content to load, then automatically trigger save as PDF
      printWindow.onload = () => {
        setTimeout(() => {
          // Focus the window and trigger print (which can be saved as PDF)
          printWindow.focus()
          printWindow.print()
          
          // Close the window after a delay
          setTimeout(() => {
            printWindow.close()
          }, 1000)
        }, 500)
      }

      toast({
        title: "PDF Generated",
        description: `PDF generated successfully for ${user.firstName} ${user.lastName}`,
      })

    } catch (error) {
      console.error('PDF generation failed:', error)
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Function to view/manage notes
  const viewNotes = (user: User) => {
    setSelectedUser(user)
    setNotesDialogOpen(true)
    setNewNote('')
    setIsPrivateNote(false)
  }

  // Function to add a note
  const addNote = async () => {
    if (!selectedUser || !newNote.trim()) return

    try {
      setActionLoading(true)
      
      const response = await fetch(`/api/admin/users/${selectedUser._id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote.trim(),
          isPrivate: isPrivateNote
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      const data = await response.json()
      
      // Update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === selectedUser._id 
            ? { ...user, adminNotes: data.adminNotes }
            : user
        )
      )

      // Update selected user
      setSelectedUser(prev => prev ? { ...prev, adminNotes: data.adminNotes } : null)
      
      setNewNote('')
      setIsPrivateNote(false)
      
      toast({
        title: "Note Added",
        description: "Admin note has been added successfully.",
      })

    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Function to delete a note
  const deleteNote = async (noteId: string) => {
    if (!selectedUser) return

    try {
      setActionLoading(true)
      
      const response = await fetch(`/api/admin/users/${selectedUser._id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      const data = await response.json()
      
      // Update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === selectedUser._id 
            ? { ...user, adminNotes: data.adminNotes }
            : user
        )
      )

      // Update selected user
      setSelectedUser(prev => prev ? { ...prev, adminNotes: data.adminNotes } : null)
      
      toast({
        title: "Note Deleted",
        description: "Admin note has been deleted successfully.",
      })

    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
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
      if (response.ok) {
        const data = await response.json()
        setChapters(data.chapters)
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error)
    }
  }

  const fetchUserProgress = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-progress/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserProgress(data.progress)
      }
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        })
        fetchUsers()
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(null)
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
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
      setActionLoading(false)
    }
  }

  const viewUserProgress = async (user: User) => {
    setSelectedUser(user)
    await fetchUserProgress(user._id)
    setProgressDialogOpen(true)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const isVerified = user.verificationStatus === 'verified'

    return matchesSearch && matchesRole && isVerified
  })

  const getUserStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="destructive">{t('status_pending')}</Badge>
    }
    if (user.role === 'admin') {
      return <Badge variant="purple">{t('admin')}</Badge>
    }
    return <Badge variant="success">{t('status_verified')}</Badge>
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">{t('searchUsers')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('searchUsersPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">{t('role')}</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="user">{t('user')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Removed: High-level metrics that are not useful here */}

          {/* Master-Detail Layout */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noUsersFound')}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* User List */}
              <div className="space-y-2 lg:col-span-1 rounded-lg border bg-white p-2 max-h-[70vh] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?._id === user._id
                  return (
                    <button
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.firstName} {user.lastName}</span>
                            {/* No Active/Inactive or Verification badges here */}
                          </div>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                            <Mail className="h-3 w-3" /> {user.email}
                          </p>
                        </div>
                        {user.role === 'user' && user.progress && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">{user.progress.averageProgress}%</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-3">
                {!selectedUser ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      {t('selectUserToView')}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{selectedUser.firstName} {selectedUser.lastName}</h3>
                            {/* Removed Active/Inactive and Verification badges in detail header */}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" /> {selectedUser.email}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <p>{t('createdLabel')}: {formatDate(new Date(selectedUser.createdAt))}</p>
                            {selectedUser.lastLoginAt && (
                              <p>{t('lastLogin')}: {formatDate(new Date(selectedUser.lastLoginAt))}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedUser.role === 'user' && selectedUser.progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>{t('progressLabel')}</span>
                            <span>{selectedUser.progress.averageProgress}%</span>
                          </div>
                          <Progress value={selectedUser.progress.averageProgress} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {selectedUser.progress.completedChapters}/{selectedUser.progress.totalChapters} {t('chaptersCompleted')}
                          </div>
                        </div>
                      )}

                      {selectedUser.role === 'user' && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{t('documentProcessingLabel')}</span>
                            {selectedUser.documentProcessing ? (
                              <Badge variant="success">
                                <FileText className="w-3 h-3 mr-1" />
                                {t('processedLabel')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{t('noData')}</Badge>
                            )}
                          </div>

                          {selectedUser.documentProcessing && (
                            <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-1">
                              <p className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {t('fileLabel')}: {selectedUser.documentProcessing.fileName}
                              </p>
                              <p className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t('processedAt')}: {formatDate(new Date(selectedUser.documentProcessing.processedAt))}
                              </p>
                              <p className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {t('pagesLabel')}: {selectedUser.documentProcessing.totalPages}
                              </p>
                            </div>
                          )}

                          {selectedUser.adminNotes && selectedUser.adminNotes.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <StickyNote className="w-3 h-3" />
                              {selectedUser.adminNotes.length} {t('adminNotesCount')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => viewUserProgress(selectedUser)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          {t('progressBtn')}
                        </Button>

                        {selectedUser.role === 'user' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDocumentData(selectedUser)}
                              className="bg-blue-50 hover:bg-blue-100"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              {t('documentsBtn')}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDocumentProcessor(selectedUser)}
                              className="bg-purple-50 hover:bg-purple-100"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              {t('processBtn')}
                            </Button>

                            {selectedUser.documentProcessing?.extractedData && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generatePDFFromData(selectedUser)}
                                disabled={isGeneratingPDF}
                                className="bg-green-50 hover:bg-green-100"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                {t('pdfBtn')}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewNotes(selectedUser)}
                              className="bg-yellow-50 hover:bg-yellow-100"
                            >
                              <StickyNote className="w-4 h-4 mr-1" />
                              {t('notesBtn')}
                            </Button>
                          </>
                        )}

                        {selectedUser.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUserToDelete(selectedUser);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t('deleteBtn')}
                          </Button>
                        )}
                      </div>

                      {/* Verification Status Detail */}
                      {selectedUser.role === 'user' && (
                        <div className="space-y-2">
                          {selectedUser.verifiedAt && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('status_verified')}: {formatDate(new Date(selectedUser.verifiedAt))}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Progress Detail Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('progressBtn')} - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              {t('manageUsersDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Overall Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('chapters')} {t('completed')}</p>
                        <p className="text-2xl font-bold">
                          {userProgress.filter((ch: any) => ch.isChapterCompleted).length}/{userProgress.length}
                        </p>
                      </div>
                      <BookOpen className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('overallProgress')}</p>
                        <p className="text-2xl font-bold">
                          {userProgress.length > 0 
                            ? Math.round((userProgress.filter((ch: any) => ch.isChapterCompleted).length / userProgress.length) * 100)
                            : 0}%
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Progress */}
              <div>
                <h4 className="font-medium mb-4">{t('chapters')} {t('progress')}</h4>
                <div className="space-y-3">
                  {userProgress.map((chapter: any) => (
                    <div key={chapter.chapterId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">{chapter.chapterTitle}</h5>
                          {chapter.isChapterCompleted && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {t('completed')}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t('chapter')} {chapter.chapterOrder}
                        </span>
                      </div>
                      <Progress 
                        value={chapter.progress} 
                        className={`h-2 mb-2 ${chapter.isChapterCompleted ? 'bg-green-100' : ''}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {t('statusHeader')}: {chapter.isChapterCompleted ? t('completed') : t('inProgress')}
                        {chapter.lastActivity && (
                          <span className="ml-4">
                            {t('lastLogin')}: {formatDate(new Date(chapter.lastActivity))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeletionTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeletionDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  deleteUser(userToDelete._id);
                }
                setDeleteDialogOpen(false);
              }}
              disabled={actionLoading}
            >
              {actionLoading ? t('deleting') : t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Processing Data Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('documentProcessingLabel')} - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              {t('manageUsersDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {selectedUser.documentProcessing ? (
                <>
                  {/* Processing Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">{t('documentProcessingLabel')}</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">{t('fileLabel')}:</span> {selectedUser.documentProcessing.fileName}</p>
                            <p><span className="font-medium">{t('pagesLabel')}:</span> {selectedUser.documentProcessing.totalPages}</p>
                            <p><span className="font-medium">Method:</span> {selectedUser.documentProcessing.processingMethod}</p>
                            <p><span className="font-medium">{t('processedAt')}:</span> {formatDate(new Date(selectedUser.documentProcessing.processedAt))}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">{t('actionsHeader')}</h4>
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              onClick={() => generatePDFFromData(selectedUser)}
                              disabled={isGeneratingPDF}
                              className="w-full"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {isGeneratingPDF ? t('processing') : t('generatePdf')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDocumentProcessor(selectedUser)}
                              className="w-full"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              {t('processBtn')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Extracted Data */}
                  <div>
                    <h4 className="font-medium mb-4">{t('extractedData')}</h4>
                    <Card>
                      <CardContent className="p-4">
                        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {selectedUser.documentProcessing.extractedData}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium mb-2">{t('noData')}</h4>
                  <p className="text-gray-600 mb-4">{t('manageUsersDesc')}</p>
                  <Button
                    onClick={() => openDocumentProcessor(selectedUser)}
                    className="mx-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('processBtn')}
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Management Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('notesBtn')} - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              {t('manageUsersDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Add New Note */}
              <div className="space-y-4">
                <h4 className="font-medium">{t('addNewNote')}</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="note">{t('noteContent')}</Label>
                    <Textarea
                      id="note"
                      placeholder={t('noteContent')}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="private"
                      checked={isPrivateNote}
                      onCheckedChange={(checked) => setIsPrivateNote(Boolean(checked))}
                    />
                    <Label htmlFor="private" className="text-sm">{t('privateNote')}</Label>
                  </div>
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim() || actionLoading}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addNote')}
                  </Button>
                </div>
              </div>

              {/* Existing Notes */}
              <div className="space-y-4">
                <h4 className="font-medium">{t('existingNotes')} ({selectedUser.adminNotes?.length || 0})</h4>
                {selectedUser.adminNotes && selectedUser.adminNotes.length > 0 ? (
                  <div className="space-y-3">
                    {selectedUser.adminNotes.map((note) => (
                      <Card key={note._id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {note.createdBy.firstName} {note.createdBy.lastName}
                              </span>
                              {note.isPrivate && (
                                <Badge variant="muted" className="text-xs">
                                  {t('privateNote')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(new Date(note.createdAt))}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNote(note._id)}
                                disabled={actionLoading}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('noData')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}