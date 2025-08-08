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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
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

  // Helper function to get verification status badge
  const getVerificationStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'documents_uploaded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><FileText className="w-3 h-3 mr-1" />Documents Uploaded</Badge>
      case 'contract_signed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Contract Signed</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'resubmission_required':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" />Resubmission Required</Badge>
      default:
        return <Badge variant="outline">No Status</Badge>
    }
  }

  const [userProgress, setUserProgress] = useState<any[]>([])

  useEffect(() => {
    fetchUsers()
    fetchChapters()
  }, [])

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
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) || 
      (statusFilter === 'inactive' && !user.isActive)
    
    const matchesVerification = verificationFilter === 'all' || user.verificationStatus === verificationFilter

    return matchesSearch && matchesRole && matchesStatus && matchesVerification
  })

  const getUserStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>
    }
    if (user.role === 'admin') {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Admin</Badge>
    }
    return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage all users and track their progress through the training program
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="verification-filter">Verification</Label>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger id="verification-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verification</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="documents_uploaded">Documents Uploaded</SelectItem>
                  <SelectItem value="contract_signed">Contract Signed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="resubmission_required">Resubmission Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verified Users</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.verificationStatus === 'verified').length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Verification</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.verificationStatus === 'pending' || u.verificationStatus === 'documents_uploaded' || u.verificationStatus === 'contract_signed').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected/Resubmission</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.verificationStatus === 'rejected' || u.verificationStatus === 'resubmission_required').length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user._id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">
                          {user.firstName} {user.lastName}
                        </h3>
                        {getUserStatusBadge(user)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <p>Created: {formatDate(new Date(user.createdAt))}</p>
                        {user.lastLoginAt && (
                          <p>Last Login: {formatDate(new Date(user.lastLoginAt))}</p>
                        )}
                      </div>
                      
                      {/* Verification Status Information */}
                      {user.role === 'user' && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Verification:</span>
                            {getVerificationStatusBadge(user.verificationStatus)}
                          </div>
                          
                          {user.verificationStatus && user.verificationStatus !== 'pending' && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              {user.passportDocument?.uploadedAt && (
                                <p className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Document: {formatDate(new Date(user.passportDocument.uploadedAt))}
                                </p>
                              )}
                              {user.contractSigned?.signedAt && (
                                <p className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Contract: {formatDate(new Date(user.contractSigned.signedAt))} 
                                  {user.contractSigned.signatureMethod && (
                                    <span className="ml-1 text-gray-500">
                                      ({user.contractSigned.signatureMethod})
                                    </span>
                                  )}
                                </p>
                              )}
                              {user.verifiedAt && (
                                <p className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified: {formatDate(new Date(user.verifiedAt))}
                                </p>
                              )}
                              {user.passportDocument?.rejectionReason && (
                                <p className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-3 h-3" />
                                  Reason: {user.passportDocument.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar for Users */}
                    {user.role === 'user' && user.progress && (
                      <div className="w-48 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{user.progress.averageProgress}%</span>
                        </div>
                        <Progress value={user.progress.averageProgress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {user.progress.completedChapters}/{user.progress.totalChapters} chapters completed
                        </div>
                      </div>
                    )}

                    {/* Document Processing Status */}
                    {user.role === 'user' && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Document Processing:</span>
                          {user.documentProcessing ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <FileText className="w-3 h-3 mr-1" />
                              Processed
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Data</Badge>
                          )}
                        </div>
                        
                        {user.documentProcessing && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              File: {user.documentProcessing.fileName}
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Processed: {formatDate(new Date(user.documentProcessing.processedAt))}
                            </p>
                            <p className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Pages: {user.documentProcessing.totalPages}
                            </p>
                          </div>
                        )}

                        {/* Admin Notes Count */}
                        {user.adminNotes && user.adminNotes.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <StickyNote className="w-3 h-3" />
                            {user.adminNotes.length} admin note{user.adminNotes.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewUserProgress(user)}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Progress
                    </Button>

                    {user.role === 'user' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDocumentData(user)}
                          className="bg-blue-50 hover:bg-blue-100"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Documents
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDocumentProcessor(user)}
                          className="bg-purple-50 hover:bg-purple-100"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Process
                        </Button>

                        {user.documentProcessing?.extractedData && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePDFFromData(user)}
                            disabled={isGeneratingPDF}
                            className="bg-green-50 hover:bg-green-100"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewNotes(user)}
                          className="bg-yellow-50 hover:bg-yellow-100"
                        >
                          <StickyNote className="w-4 h-4 mr-1" />
                          Notes
                        </Button>
                      </>
                    )}
                    
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Progress Detail Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Progress Details - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Detailed progress tracking for this user
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
                        <p className="text-sm text-muted-foreground">Chapters Completed</p>
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
                        <p className="text-sm text-muted-foreground">Overall Progress</p>
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
                <h4 className="font-medium mb-4">Chapter Progress</h4>
                <div className="space-y-3">
                  {userProgress.map((chapter: any) => (
                    <div key={chapter.chapterId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">{chapter.chapterTitle}</h5>
                          {chapter.isChapterCompleted && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Chapter {chapter.chapterOrder}
                        </span>
                      </div>
                      <Progress 
                        value={chapter.progress} 
                        className={`h-2 mb-2 ${chapter.isChapterCompleted ? 'bg-green-100' : ''}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        Status: {chapter.isChapterCompleted ? 'Completed' : 'Not Started'}
                        {chapter.lastActivity && (
                          <span className="ml-4">
                            Last activity: {formatDate(new Date(chapter.lastActivity))}
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user {userToDelete?.firstName} {userToDelete?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
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
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Processing Data Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Document Processing Data - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              View extracted document data and processing details
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
                          <h4 className="font-medium">Processing Details</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">File:</span> {selectedUser.documentProcessing.fileName}</p>
                            <p><span className="font-medium">Pages:</span> {selectedUser.documentProcessing.totalPages}</p>
                            <p><span className="font-medium">Method:</span> {selectedUser.documentProcessing.processingMethod}</p>
                            <p><span className="font-medium">Processed:</span> {formatDate(new Date(selectedUser.documentProcessing.processedAt))}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Actions</h4>
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              onClick={() => generatePDFFromData(selectedUser)}
                              disabled={isGeneratingPDF}
                              className="w-full"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {isGeneratingPDF ? 'Generating...' : 'Generate PDF Report'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDocumentProcessor(selectedUser)}
                              className="w-full"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Process New Document
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Extracted Data */}
                  <div>
                    <h4 className="font-medium mb-4">Extracted Data</h4>
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
                  <h4 className="text-lg font-medium mb-2">No Document Data</h4>
                  <p className="text-gray-600 mb-4">This user hasn't processed any documents yet.</p>
                  <Button
                    onClick={() => openDocumentProcessor(selectedUser)}
                    className="mx-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Process Document
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Management Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Admin Notes - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Manage administrative notes for this user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Add New Note */}
              <div className="space-y-4">
                <h4 className="font-medium">Add New Note</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="note">Note Content</Label>
                    <Textarea
                      id="note"
                      placeholder="Enter admin note..."
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
                    <Label htmlFor="private" className="text-sm">
                      Private note (not visible to user)
                    </Label>
                  </div>
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim() || actionLoading}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Existing Notes */}
              <div className="space-y-4">
                <h4 className="font-medium">Existing Notes ({selectedUser.adminNotes?.length || 0})</h4>
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
                                <Badge variant="secondary" className="text-xs">
                                  Private
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
                    <p>No notes yet for this user</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}