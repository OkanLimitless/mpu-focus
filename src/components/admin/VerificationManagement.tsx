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
import { CheckCircle2, XCircle, Clock, AlertTriangle, Eye, FileText, User, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import DocumentPreview from '@/components/ui/document-preview'
import { SignatureDisplay } from '@/components/ui/digital-signature'
import { useI18n } from '@/components/providers/i18n-provider'

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
  const { t } = useI18n()

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
      contract_signed: { variant: 'secondary' as const, className: 'bg-purple-100 text-purple-800', icon: Shield },
      resubmission_required: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      verified: { variant: 'secondary' as const, className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      rejected: { variant: 'secondary' as const, className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const { variant, className, icon: Icon } = variants[safeStatus as keyof typeof variants] || variants.pending
    const displayText = safeStatus === 'contract_signed' ? t('underReview') : (
      safeStatus === 'documents_uploaded' ? t('status_documents_uploaded') :
      safeStatus === 'resubmission_required' ? t('status_resubmission_required') :
      safeStatus === 'verified' ? t('status_verified') :
      safeStatus === 'rejected' ? t('status_rejected') : t('status_pending')
    )
    
    return (
      <Badge variant={variant} className={`flex items-center space-x-1 ${className}`}>
        <Icon className="w-3 h-3" />
        <span className="capitalize">{displayText}</span>
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
        <h1 className="text-2xl font-bold">{t('verificationManagement')}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('status_pending')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('status_verified')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('status_rejected')}</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('underReview')}</p>
                <p className="text-2xl font-bold">{stats.contractSigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">{t('status_resubmission_required')}</p>
                <p className="text-2xl font-bold">{stats.resubmission}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">{t('searchUsers')}</Label>
              <Input
                id="search"
                placeholder={t('searchUsersPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">{t('filterByStatus')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('status_pending')}</SelectItem>
                  <SelectItem value="documents_uploaded">{t('status_documents_uploaded')}</SelectItem>
                  <SelectItem value="contract_signed">{t('underReview')}</SelectItem>
                  <SelectItem value="resubmission_required">{t('status_resubmission_required')}</SelectItem>
                  <SelectItem value="verified">{t('status_verified')}</SelectItem>
                  <SelectItem value="rejected">{t('status_rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchUsers} variant="outline">
                {t('update')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('verificationManagement')}</CardTitle>
          <CardDescription>{t('manageVerificationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                {t('loading')}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('noUsersFound')}
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
                      <p className="text-xs text-gray-500 mb-1">{t('statusHeader')}</p>
                      {getStatusBadge(user.verificationStatus || 'pending')}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">{t('documentLabel')}</p>
                      <div className="text-sm">
                        {user.passportDocument ? (
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span>{t('uploaded')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>{t('missing')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">{t('contractLabel')}</p>
                      <div className="text-sm">
                        {user.contractSigned?.signedAt ? (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span>{t('signedLabel')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>{t('pendingLabel')}</span>
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
                          {t('review')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t('userVerificationReview')}</DialogTitle>
                        </DialogHeader>
                        
                        {selectedUser && (
                          <div className="space-y-6">
                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>{t('nameLabel')}</Label>
                                <p className="font-medium">{selectedUser.firstName || 'N/A'} {selectedUser.lastName || ''}</p>
                              </div>
                              <div>
                                <Label>{t('emailLabel')}</Label>
                                <p className="font-medium">{selectedUser.email || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Current Status Alert */}
                            {selectedUser.verificationStatus === 'resubmission_required' && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                                  <p className="text-orange-800 font-medium">
                                    {t('status_resubmission_required')}
                                  </p>
                                </div>
                                <p className="text-orange-700 text-sm mt-1">
                                  {t('allowResubmission')}
                                </p>
                              </div>
                            )}

                            {/* Document Preview */}
                            <div>
                              <Label className="text-lg font-semibold mb-4 block">{t('passportDocument')}</Label>
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
                                    <p className="text-sm">{t('notAvailablePreview')}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Contract Details */}
                            {selectedUser.contractSigned && (
                              <div className="space-y-4">
                                <Label className="text-lg font-semibold">{t('contractDetails')}</Label>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm text-gray-600">{t('signedAt')}</Label>
                                      <p className="text-sm font-medium">
                                        {selectedUser.contractSigned.signedAt ? formatDate(selectedUser.contractSigned.signedAt) : 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">{t('signatureMethod')}</Label>
                                      <p className="text-sm font-medium capitalize">
                                        {selectedUser.contractSigned.signatureMethod === 'digital_signature' 
                                          ? t('digitalSignature') 
                                          : 'Checkbox'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">{t('ipAddress')}</Label>
                                      <p className="text-sm font-medium">{selectedUser.contractSigned.ipAddress}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">{t('userAgent')}</Label>
                                      <p className="text-sm font-medium break-all">{selectedUser.contractSigned.userAgent}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Digital Signature Display */}
                                  {selectedUser.contractSigned.signatureData && (
                                    <div>
                                      <Label className="text-sm text-gray-600 mb-2 block">{t('digitalSignature')}</Label>
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
                              <Label className="text-lg font-semibold">{t('adminReview')}</Label>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="review-status">{t('decision')}</Label>
                                  <Select value={reviewAction || ''} onValueChange={(value) => setReviewAction(value as 'approve' | 'reject')}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('decision')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approve">{t('approve')}</SelectItem>
                                      <SelectItem value="reject">{t('reject')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {reviewAction === 'reject' && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="rejection-reason">{t('rejectionReason')}</Label>
                                      <Textarea
                                        id="rejection-reason"
                                        placeholder={t('rejectionReason')}
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
                                        {t('allowResubmission')}
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                <Button
                                  onClick={handleSubmitReview}
                                  disabled={isSubmittingReview || !reviewAction}
                                  className="w-full"
                                >
                                  {isSubmittingReview ? t('processing') : t('submitReview')}
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