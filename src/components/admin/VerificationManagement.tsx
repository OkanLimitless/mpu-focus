'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Eye, FileText, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import DocumentPreview from '@/components/ui/document-preview'
import { SignatureDisplay } from '@/components/ui/digital-signature'

interface VerificationUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  verificationStatus: string
  passportDocument?: {
    filename: string
    uploadedAt: Date
    status: string
    rejectionReason?: string
    url?: string // Added for document preview
  }
  contractSigned?: {
    signedAt: Date
    ipAddress: string
    userAgent?: string
    signatureData?: string // Base64 encoded signature
    signatureMethod?: string
  }
  verifiedAt?: Date
  createdAt: Date
}

interface VerificationStats {
  pending: number
  documentsUploaded: number
  contractSigned: number
  verified: number
  rejected: number
  resubmission: number
}

export default function VerificationManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<VerificationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<VerificationUser | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
    const [stats, setStats] = useState<VerificationStats>({
    pending: 0,
    documentsUploaded: 0,
    contractSigned: 0,
    verified: 0,
    rejected: 0,
    resubmission: 0
  })
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  
  // Review state
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [allowResubmission, setAllowResubmission] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [page, statusFilter, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
        search: searchTerm
      })

      const response = await fetch(`/api/admin/verification?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch verification users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch verification data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    // Ensure status is a string and provide fallback
    const safeStatus = status || 'pending'
    
    const variants = {
      pending: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', icon: Clock },
      documents_uploaded: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800', icon: FileText },
      contract_signed: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', icon: User },
      resubmission_required: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      verified: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      rejected: { variant: 'secondary' as const, className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const { variant, className, icon: Icon } = variants[safeStatus as keyof typeof variants] || variants.pending
    
    return (
      <Badge variant={variant} className={`flex items-center space-x-1 ${className}`}>
        <Icon className="w-3 h-3" />
        <span className="capitalize">{safeStatus.replace(/_/g, ' ')}</span>
      </Badge>
    )
  }

  const handleReviewUser = (user: VerificationUser) => {
    setSelectedUser(user)
    setReviewAction(null)
    setRejectionReason('')
    setAllowResubmission(false) // Reset resubmission option
    setIsReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedUser || !reviewAction) return

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmittingReview(true)
      const response = await fetch(`/api/admin/verification/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reviewAction === 'approve' ? 'verified' : 'rejected',
          rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined,
          allowResubmission: reviewAction === 'reject' ? allowResubmission : false
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message,
        })
        
        // Reset form and close dialog
        setReviewAction(null)
        setRejectionReason('')
        setAllowResubmission(false)
        setIsReviewDialogOpen(false)
        
        // Refresh users list
        fetchUsers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }
    } catch (error: any) {
      console.error('Review submission error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Verification Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold">{stats.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Resubmission</p>
                <p className="text-2xl font-bold">{stats.resubmission}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="documents_uploaded">Documents Uploaded</SelectItem>
                  <SelectItem value="contract_signed">Contract Signed</SelectItem>
                  <SelectItem value="resubmission_required">Resubmission Required</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchUsers} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            Manage user verification documents and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading verification data...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found matching the current filters.
              </div>
            ) : (
              users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <p className="font-medium">{user.firstName || 'N/A'} {user.lastName || ''}</p>
                      <p className="text-sm text-gray-600">{user.email || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      {getStatusBadge(user.verificationStatus || 'pending')}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Document</p>
                      <div className="text-sm">
                        {user.passportDocument ? (
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span>Uploaded</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>Missing</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Contract</p>
                      <div className="text-sm">
                        {user.contractSigned?.signedAt ? (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span>Signed</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewUser(user)}
                          disabled={user.verificationStatus === 'pending' || user.verificationStatus === 'documents_uploaded'}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>User Verification Review</DialogTitle>
                        </DialogHeader>
                        
                        {selectedUser && (
                          <div className="space-y-6">
                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Name</Label>
                                <p className="font-medium">{selectedUser.firstName || 'N/A'} {selectedUser.lastName || ''}</p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="font-medium">{selectedUser.email || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Current Status Alert */}
                            {selectedUser.verificationStatus === 'resubmission_required' && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                                  <p className="text-orange-800 font-medium">
                                    This user is in resubmission status
                                  </p>
                                </div>
                                <p className="text-orange-700 text-sm mt-1">
                                  Previous documents were rejected. User can resubmit without re-signing the contract.
                                </p>
                              </div>
                            )}

                            {/* Document Preview */}
                            <div>
                              <Label className="text-lg font-semibold mb-4 block">Passport Document</Label>
                              {selectedUser.passportDocument?.url || selectedUser.passportDocument?.filename ? (
                                <DocumentPreview
                                  filename={selectedUser.passportDocument.filename}
                                  url={
                                    selectedUser.passportDocument.url
                                      ? `/api/documents/proxy?url=${encodeURIComponent(selectedUser.passportDocument.url)}`
                                      : `/api/documents/proxy?url=${encodeURIComponent(
                                          `https://utfs.io/f/${selectedUser.passportDocument.filename}`
                                        )}`
                                  }
                                  className="w-full"
                                />
                              ) : (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <div className="flex items-center space-x-2 text-gray-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <p className="text-sm">
                                      Document not available for preview. Please contact support.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Contract Details */}
                            {selectedUser.contractSigned && (
                              <div className="space-y-4">
                                <Label className="text-lg font-semibold">Contract Details</Label>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm text-gray-600">Signed At</Label>
                                      <p className="text-sm font-medium">
                                        {selectedUser.contractSigned.signedAt ? formatDate(selectedUser.contractSigned.signedAt) : 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">Signature Method</Label>
                                      <p className="text-sm font-medium capitalize">
                                        {selectedUser.contractSigned.signatureMethod === 'digital_signature' 
                                          ? 'Digital Signature' 
                                          : 'Checkbox Agreement'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">IP Address</Label>
                                      <p className="text-sm font-medium">{selectedUser.contractSigned.ipAddress}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">User Agent</Label>
                                      <p className="text-sm font-medium break-all">{selectedUser.contractSigned.userAgent}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Digital Signature Display */}
                                  {selectedUser.contractSigned.signatureData && (
                                    <div>
                                      <Label className="text-sm text-gray-600 mb-2 block">Digital Signature</Label>
                                      <SignatureDisplay 
                                        signatureData={selectedUser.contractSigned.signatureData}
                                        className="border rounded-lg"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Review Form */}
                            <div className="space-y-4">
                              <Label className="text-lg font-semibold">Admin Review</Label>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="review-status">Decision</Label>
                                  <Select value={reviewAction || ''} onValueChange={(value) => setReviewAction(value as 'approve' | 'reject')}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select decision" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approve">Approve</SelectItem>
                                      <SelectItem value="reject">Reject</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {reviewAction === 'reject' && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                                      <Textarea
                                        id="rejection-reason"
                                        placeholder="Please provide a reason for rejection..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="min-h-[100px]"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="allow-resubmission"
                                        checked={allowResubmission}
                                        onCheckedChange={(checked) => setAllowResubmission(checked as boolean)}
                                      />
                                      <Label htmlFor="allow-resubmission" className="text-sm">
                                        Allow document re-submission (user won't need to sign contract again)
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                <Button
                                  onClick={handleSubmitReview}
                                  disabled={isSubmittingReview || !reviewAction}
                                  className="w-full"
                                >
                                  {isSubmittingReview ? 'Processing...' : 'Submit Review'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}