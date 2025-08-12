'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  BookOpen,
  Play,
  Upload,
  LogOut,
  Search,
  User
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/components/providers/i18n-provider'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userProgress, setUserProgress] = useState({
    totalChapters: 0,
    completedChapters: 0,
    totalVideos: 0,
    completedVideos: 0,
    overallProgress: 0
  })
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signatureMethod, setSignatureMethod] = useState<'checkbox' | 'digital_signature' | 'qes'>('checkbox')
  const { t } = useI18n()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role === 'admin') {
      router.push('/admin')
      return
    }

    // Load user progress and details
    fetchUserProgress()
    fetchUserDetails()
  }, [session, status, router])

  useEffect(() => {
    if (!userDetails) return
    // Do not auto-redirect or auto-open dialog; allow the user to initiate verification from the dashboard UI
    if (userDetails.verificationStatus && userDetails.verificationStatus !== 'verified') {
      setShowVerificationDialog(false)
    }
  }, [userDetails])

  // Ensure in-dashboard verification flow has a token available when dialog opens
  useEffect(() => {
    if (!showVerificationDialog || verificationToken) return
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/user/verification-link')
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data?.token) setVerificationToken(data.token)
        }
      } catch {}
    })()
    return () => {
      isMounted = false
    }
  }, [showVerificationDialog, verificationToken])

  const fetchUserProgress = async () => {
    try {
      const response = await fetch('/api/user-progress')
      if (response.ok) {
        const data = await response.json()
        console.log('User progress data:', data.progress) // Debug log
        setUserProgress(data.progress)
      } else {
        console.error('Failed to fetch user progress:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetails = async () => {
    try {
      const response = await fetch('/api/user/details')
      if (response.ok) {
        const data = await response.json()
        setUserDetails(data.user)
      } else {
        console.error('Failed to fetch user details:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const uploadDocumentInApp = async () => {
    if (!selectedFile || !verificationToken) return
    // Only allow upload when pending or (resubmission_required with allowResubmission)
    const canUpload = userDetails?.verificationStatus === 'pending' ||
      (userDetails?.verificationStatus === 'resubmission_required' && userDetails?.passportDocument?.allowResubmission)
    if (!canUpload) return
    try {
      setIsSubmitting(true)
      const formData = new FormData()
      formData.append('document', selectedFile)
      formData.append('token', verificationToken)
      const response = await fetch('/api/verification/upload-document', { method: 'POST', body: formData })
      if (response.ok) {
        await fetchUserDetails()
        setSelectedFile(null)
      } else {
        // Surface server error in console for now
        const data = await response.json().catch(() => ({}))
        console.error('Upload error:', data)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const signContractInApp = async () => {
    if (!verificationToken) return
    // Only allow sign when documents_uploaded
    if (userDetails?.verificationStatus !== 'documents_uploaded') return
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/verification/sign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken, agreed: true, signatureData, signatureMethod })
      })
      if (response.ok) {
        await fetchUserDetails()
      } else {
        const data = await response.json().catch(() => ({}))
        console.error('Sign error:', data)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">{t('status_pending')}</Badge>
      case 'documents_uploaded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('status_documents_uploaded')}</Badge>
      case 'contract_signed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('status_contract_signed')}</Badge>
      case 'resubmission_required':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{t('status_resubmission_required')}</Badge>
      case 'verified':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('status_verified')}</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">{t('status_rejected')}</Badge>
      default:
        return <Badge variant="secondary">{t('status_unknown')}</Badge>
    }
  }

  const getVerificationMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return t('verificationSteps')
      case 'documents_uploaded':
        return t('docsUploadedMsg')
      case 'contract_signed':
        return t('underReviewMsg')
      case 'resubmission_required':
        return t('resubmissionMsg')
      case 'rejected':
        return t('rejectedMsg')
      default:
        return t('defaultVerificationMsg')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // New: helper to open the dedicated verification page
  const startVerification = async () => {
    try {
      const res = await fetch('/api/user/verification-link')
      if (res.ok) {
        const data = await res.json()
        if (data?.token) {
          router.push(`/verification/${data.token}`)
          return
        }
      }
    } catch (e) {
      console.error('Unable to start verification', e)
    }
  }

  const userInitials = `${session.user.firstName?.[0] || ''}${session.user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="text-xl font-bold text-gray-900 tracking-tight">MPU-Focus</div>
            <div className="hidden md:flex items-center min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder={t('search')} className="pl-9 w-64 lg:w-72" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-700">
              {t('welcome')}, {session.user.firstName} {session.user.lastName}
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-blue-100">
              {userInitials || <User className="h-4 w-4" />}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Main Content */}
          <main className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{t('trainingDashboard')}</h2>
                <p className="text-gray-600">{t('trainingDashboardSub')}</p>
              </div>
              {userDetails && userDetails.verificationStatus !== 'verified' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('accountStatus')}</span>
                  {getVerificationBadge(userDetails.verificationStatus)}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('overallProgress')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : `${userProgress.overallProgress}%`}</div>
                  <Progress value={userProgress.overallProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{t('completed')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('chapters')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : `${userProgress.completedChapters}/${userProgress.totalChapters}`}</div>
                  <p className="text-xs text-muted-foreground">{t('completed')}</p>
                </CardContent>
              </Card>

              {userDetails?.verificationStatus !== 'verified' && (
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">{t('account')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {userDetails ? getVerificationBadge(userDetails.verificationStatus) : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t('verificationStatus')}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Verification Status Alert */}
            {userDetails && userDetails.verificationStatus !== 'verified' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-orange-800">{t('accountVerificationRequired')}</h3>
                      <p className="text-sm text-orange-700 mt-1">{getVerificationMessage(userDetails.verificationStatus)}</p>
                      <ul className="text-sm text-orange-700 mt-3 list-disc pl-5 space-y-1">
                        <li>{t('uploadId')}</li>
                        <li>{t('signAgreement')}</li>
                        <li>{t('reviewTimeline')}</li>
                      </ul>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button onClick={startVerification}>
                          <Upload className="h-4 w-4 mr-2" /> {t('startVerificationNow')}
                        </Button>
                        {userDetails.verificationStatus === 'resubmission_required' && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/user/resubmission-link')
                                const data = await response.json()
                                if (data.success && data.resubmissionUrl) {
                                  window.open(data.resubmissionUrl, '_blank')
                                }
                              } catch {}
                            }}
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                          >
                            <Upload className="h-4 w-4 mr-2" /> {t('uploadNewDocuments')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Section */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('yourCourse')}</CardTitle>
                  <CardDescription>
                    {userDetails?.verificationStatus === 'verified' ? t('continueTraining') : t('courseAccessPending')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : userDetails?.verificationStatus === 'verified' ? (
                      <>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{t('yourCourse')}</h4>
                            <p className="text-sm text-gray-600">{t('watchVideosAndTrack')}</p>
                          </div>
                          <Button onClick={() => router.push('/course')}>{t('continue')}</Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">{t('courseAccessLocked')}</h4>
                        <p className="text-sm text-gray-600">{t('completeVerificationToAccess')}</p>
                        <div className="mt-4">
                          <Button size="sm" onClick={startVerification}>
                            <Play className="h-4 w-4 mr-2" /> {t('startVerification')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Verification Status Details - hide when verified */}
              {userDetails?.verificationStatus !== 'verified' && (
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>{t('verificationStatus')}</CardTitle>
                    <CardDescription>{t('accountVerification')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loading || !userDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Document Upload Status */}
                          <div className="flex items-center space-x-3">
                            {userDetails.passportDocument ? (
                              userDetails.passportDocument.status === 'approved' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : userDetails.passportDocument.status === 'rejected' ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-600" />
                              )
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{t('identityDocument')}</p>
                              <p className="text-xs text-gray-600">
                                {userDetails.passportDocument
                                  ? userDetails.passportDocument.status === 'approved'
                                    ? t('approved')
                                    : userDetails.passportDocument.status === 'rejected'
                                    ? t('rejected')
                                    : t('underReview')
                                  : t('notUploaded')}
                              </p>
                            </div>
                          </div>

                          {/* Contract Status */}
                          <div className="flex items-center space-x-3">
                            {userDetails.contractSigned?.signedAt ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{t('serviceAgreement')}</p>
                              <p className="text-xs text-gray-600">{userDetails.contractSigned?.signedAt ? t('signed') : t('notSigned')}</p>
                            </div>
                          </div>

                          {/* Verification Status */}
                          <div className="flex items-center space-x-3">
                            {userDetails.verificationStatus === 'verified' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{t('accountVerification')}</p>
                              <p className="text-xs text-gray-600">{userDetails.verificationStatus === 'verified' ? t('complete') : t('inProgress')}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}