'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import DocumentPreview from '@/components/ui/document-preview'
import { SignatureDisplay } from '@/components/ui/digital-signature'
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  Eye,
  Download,
  PenTool
} from 'lucide-react'

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
    rejected: 0 
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
      documents_uploaded: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800', icon: FileCheck },
      contract_signed: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', icon: Clock },
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PenTool className="h-5 w-5" />
          <span>Verification Management</span>
        </CardTitle>
        <CardDescription>
          Review and approve user document uploads and contract signatures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-sm font-medium">Pending</div>
            <div className="text-2xl font-bold text-gray-700">{stats.pending}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Documents</div>
            <div className="text-2xl font-bold text-blue-700">{stats.documentsUploaded}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-yellow-600 text-sm font-medium">Under Review</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.contractSigned}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Verified</div>
            <div className="text-2xl font-bold text-green-700">{stats.verified}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 text-sm font-medium">Rejected</div>
            <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="documents_uploaded">Documents Uploaded</option>
            <option value="contract_signed">Contract Signed</option>
            <option value="resubmission_required">Resubmission Required</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Documents</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contract</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Submitted</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading verification data...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{user.firstName || 'N/A'} {user.lastName || ''}</div>
                          <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(user.verificationStatus || 'pending')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {user.passportDocument ? (
                            <div className="flex items-center space-x-2">
                              <FileCheck className="h-4 w-4 text-green-600" />
                              <span>Uploaded</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-gray-400" />
                              <span>Not uploaded</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {user.contractSigned ? (
                            <div className="flex items-center space-x-2">
                              <PenTool className="h-4 w-4 text-green-600" />
                              <span>Signed</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-gray-400" />
                              <span>Not signed</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReviewUser(user)}
                          disabled={user.verificationStatus === 'pending' || user.verificationStatus === 'documents_uploaded'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} 
              ({pagination.total} total users)
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review User Verification</DialogTitle>
              <DialogDescription>
                Review submitted documents and contract for verification approval
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                {/* User Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.firstName || 'N/A'} {selectedUser.lastName || ''}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-600">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Current Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedUser.verificationStatus || 'pending')}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Registered</Label>
                    <p className="text-sm text-gray-600">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'N/A'}</p>
                  </div>
                </div>

                {/* Document Information */}
                {selectedUser.passportDocument && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Identity Document</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Filename</Label>
                        <p className="text-sm text-gray-600">{selectedUser.passportDocument.filename}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Uploaded</Label>
                        <p className="text-sm text-gray-600">
                          {formatDate(selectedUser.passportDocument.uploadedAt)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Current Status</Label>
                        <div className="mt-1">
                          {getStatusBadge(selectedUser.passportDocument.status)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Document Preview */}
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
                )}

                {/* Contract Information */}
                {selectedUser.contractSigned && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Service Agreement</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Signed Date</Label>
                        <p className="text-sm text-gray-600">
                          {formatDate(selectedUser.contractSigned.signedAt)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">IP Address</Label>
                        <p className="text-sm text-gray-600">{selectedUser.contractSigned.ipAddress}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Signature Method</Label>
                        <p className="text-sm text-gray-600">
                          {selectedUser.contractSigned.signatureMethod === 'digital_signature' 
                            ? 'Digital Signature' 
                            : 'Checkbox Agreement'}
                        </p>
                      </div>
                      {selectedUser.contractSigned.userAgent && (
                        <div>
                          <Label className="text-sm font-medium">User Agent</Label>
                          <p className="text-xs text-gray-600 truncate" title={selectedUser.contractSigned.userAgent}>
                            {selectedUser.contractSigned.userAgent}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Digital Signature Display */}
                    {selectedUser.contractSigned.signatureData && (
                      <div className="mt-4">
                        <SignatureDisplay
                          signatureData={selectedUser.contractSigned.signatureData}
                          title="Digital Signature"
                          className="w-full max-w-md"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Review Actions */}
                {(selectedUser.verificationStatus === 'contract_signed' || selectedUser.verificationStatus === 'resubmission_required') && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Review Decision</h4>
                    
                    {selectedUser.verificationStatus === 'resubmission_required' && (
                      <div className="bg-orange-50 p-3 rounded-lg mb-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <p className="text-sm text-orange-800">
                            <strong>Resubmission Status:</strong> This user was previously rejected and is allowed to resubmit documents.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-4">
                      <Button
                        variant={reviewAction === 'approve' ? 'default' : 'outline'}
                        onClick={() => setReviewAction('approve')}
                        className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant={reviewAction === 'reject' ? 'destructive' : 'outline'}
                        onClick={() => setReviewAction('reject')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>

                    {reviewAction === 'reject' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                          <Textarea
                            id="rejectionReason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a detailed reason for rejection..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="allowResubmission"
                              checked={allowResubmission}
                              onChange={(e) => setAllowResubmission(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="allowResubmission" className="text-sm font-medium">
                              Allow document re-submission
                            </Label>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>If checked:</strong> User can upload new documents without re-signing the contract</p>
                            <p><strong>If unchecked:</strong> User verification will be permanently rejected</p>
                          </div>
                          
                          {allowResubmission && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-800">
                                📧 The user will receive an email with instructions to upload new documents. 
                                Their contract signature will remain valid.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsReviewDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview || !reviewAction}
                        className="flex-1"
                      >
                        {isSubmittingReview ? 'Processing...' : 'Submit Review'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already processed */}
                {(selectedUser.verificationStatus === 'verified' || selectedUser.verificationStatus === 'rejected') && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium">Review Complete</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      This user has already been {selectedUser.verificationStatus}
                      {selectedUser.verifiedAt && ` on ${formatDate(selectedUser.verifiedAt)}`}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}