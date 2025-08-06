'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  Search,
  Filter,
  UserCheck,
  FileText,
  Calendar
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  }
  contractSigned?: {
    signedAt: Date
    ipAddress: string
    userAgent: string
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
  
  // Review form states
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      verified: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800', icon: CheckCircle },
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
    setIsReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedUser || !reviewAction) return

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/verification/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: reviewAction,
          rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(users.map(user => 
          user._id === selectedUser._id ? data.user : user
        ))
        setIsReviewDialogOpen(false)
        toast({
          title: "Success",
          description: `User verification ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`,
        })
        fetchUsers() // Refresh to update stats
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update verification')
      }
    } catch (error: any) {
      console.error('Error updating verification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update verification",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
          <UserCheck className="h-5 w-5" />
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
                              <FileText className="h-4 w-4 text-green-600" />
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
                          disabled={user.verificationStatus === 'pending'}
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
                    
                    {/* Document viewing would require integration with file storage */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Document preview and download functionality would be integrated with your file storage system.
                      </p>
                    </div>
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
                    </div>
                  </div>
                )}

                {/* Review Actions */}
                {selectedUser.verificationStatus === 'contract_signed' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Review Decision</h4>
                    
                    <div className="flex space-x-4">
                      <Button
                        variant={reviewAction === 'approve' ? 'default' : 'outline'}
                        onClick={() => setReviewAction('approve')}
                        className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
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
                      <div>
                        <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                        <Textarea
                          id="rejectionReason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Please provide a detailed reason for rejection..."
                          className="mt-1"
                        />
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
                        disabled={isSubmitting || !reviewAction}
                        className="flex-1"
                      >
                        {isSubmitting ? 'Processing...' : 'Submit Review'}
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