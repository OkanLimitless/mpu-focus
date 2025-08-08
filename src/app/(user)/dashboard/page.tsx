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
  FileText,
  Home,
  BarChart3,
  HelpCircle,
  Settings,
  Search,
  User
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    // Redirect unverified users to dedicated verification page
    if (userDetails.verificationStatus && userDetails.verificationStatus !== 'verified') {
      // Fetch or create verification token and redirect
      fetch('/api/user/verification-link')
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            if (data?.token) {
              router.push(`/verification/${data.token}`)
              return
            }
          }
          // If token retrieval fails, keep fallback dialog available
          setShowVerificationDialog(true)
        })
        .catch(() => {
          setShowVerificationDialog(true)
        })
    } else {
      setShowVerificationDialog(false)
    }
  }, [userDetails, router])

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
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>
      case 'documents_uploaded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Documents Uploaded</Badge>
      case 'contract_signed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Under Review</Badge>
      case 'resubmission_required':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Resubmission Required</Badge>
      case 'verified':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getVerificationMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Please complete verification steps below to upload your documents and sign the service agreement.'
      case 'documents_uploaded':
        return 'Your documents have been uploaded. Please complete the contract signing process.'
      case 'contract_signed':
        return 'Your documents and contract are being reviewed by our team. This typically takes 1-2 business days.'
      case 'resubmission_required':
        return 'Your documents need to be updated. Please upload new documents. Your contract signature remains valid.'
      case 'rejected':
        return 'Your submission was rejected. Please contact support for more information and to resubmit.'
      default:
        return 'Please complete the verification process to access your account.'
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

  const userInitials = `${session.user.firstName?.[0] || ''}${session.user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-gray-900 tracking-tight">MPU-Focus</div>
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search your course" className="pl-9 w-72" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center text-sm text-gray-700">
              Welcome, {session.user.firstName} {session.user.lastName}
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {userInitials || <User className="h-4 w-4" />}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <Card className="sticky top-[5.5rem]">
              <CardHeader>
                <CardTitle className="text-sm">Navigation</CardTitle>
                <CardDescription>Quick links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/dashboard')}>
                  <Home className="h-4 w-4 mr-2" /> Dashboard
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/course')}>
                  <BookOpen className="h-4 w-4 mr-2" /> Course
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/beratung')}>
                  <HelpCircle className="h-4 w-4 mr-2" /> Support
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/dashboard')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Progress
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/dashboard')}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Your Training Dashboard</h2>
                <p className="text-gray-600">Track progress, access your course, and complete verification.</p>
              </div>
              {userDetails && userDetails.verificationStatus !== 'verified' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Account Status:</span>
                  {getVerificationBadge(userDetails.verificationStatus)}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : `${userProgress.overallProgress}%`}</div>
                  <Progress value={userProgress.overallProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">Course completion</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Chapters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : `${userProgress.completedChapters}/${userProgress.totalChapters}`}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : `${userProgress.completedVideos}/${userProgress.totalVideos}`}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {userDetails ? getVerificationBadge(userDetails.verificationStatus) : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Verification status</p>
                </CardContent>
              </Card>
            </div>

            {/* Verification Status Alert */}
            {userDetails && userDetails.verificationStatus !== 'verified' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-orange-800">Account Verification Required</h3>
                      <p className="text-sm text-orange-700 mt-1">{getVerificationMessage(userDetails.verificationStatus)}</p>
                      <ul className="text-sm text-orange-700 mt-3 list-disc pl-5 space-y-1">
                        <li>Upload a clear photo of your ID/passport</li>
                        <li>Sign the service agreement digitally</li>
                        <li>We will review within 1–2 business days</li>
                      </ul>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button onClick={() => setShowVerificationDialog(true)}>
                          <Upload className="h-4 w-4 mr-2" /> Start Verification Now
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
                            <Upload className="h-4 w-4 mr-2" /> Upload New Documents
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
                  <CardTitle>Your Course</CardTitle>
                  <CardDescription>
                    {userDetails?.verificationStatus === 'verified' ? 'Continue your training progress' : 'Course access pending verification'}
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
                            <h4 className="font-medium">Training Course</h4>
                            <p className="text-sm text-gray-600">Continue your learning journey</p>
                          </div>
                          <Button onClick={() => router.push('/course')}>Continue</Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Watch videos, track your progress, and complete your training</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">Course Access Locked</h4>
                        <p className="text-sm text-gray-600">Complete your account verification to access the full course.</p>
                        <div className="mt-4">
                          <Button size="sm" onClick={() => setShowVerificationDialog(true)}>
                            <Play className="h-4 w-4 mr-2" /> Start Verification
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Most-used actions for your study</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start" onClick={() => router.push('/course')}>
                    <Play className="h-4 w-4 mr-2" /> Continue Course
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => router.push('/course')}>
                    <FileText className="h-4 w-4 mr-2" /> View Chapters
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => router.push('/beratung')}>
                    <HelpCircle className="h-4 w-4 mr-2" /> Contact Support
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => router.push('/dashboard')}>
                    <BarChart3 className="h-4 w-4 mr-2" /> View Progress
                  </Button>
                </CardContent>
              </Card>

              {/* Verification Status Details - hide when verified */}
              {userDetails?.verificationStatus !== 'verified' && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Verification Status</CardTitle>
                    <CardDescription>Your account verification progress</CardDescription>
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
                              <p className="text-sm font-medium">Identity Document</p>
                              <p className="text-xs text-gray-600">
                                {userDetails.passportDocument
                                  ? userDetails.passportDocument.status === 'approved'
                                    ? 'Approved'
                                    : userDetails.passportDocument.status === 'rejected'
                                    ? 'Rejected - Please resubmit'
                                    : 'Under review'
                                  : 'Not uploaded'}
                              </p>
                            </div>
                          </div>

                          {/* Contract Status */}
                          <div className="flex items-center space-x-3">
                            {userDetails.contractSigned ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">Service Agreement</p>
                              <p className="text-xs text-gray-600">{userDetails.contractSigned ? 'Signed' : 'Not signed'}</p>
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
                              <p className="text-sm font-medium">Account Verification</p>
                              <p className="text-xs text-gray-600">{userDetails.verificationStatus === 'verified' ? 'Complete' : 'In progress'}</p>
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

      {/* In-dashboard Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Complete Your Verification</DialogTitle>
            <DialogDescription>
              Follow these steps to activate your account. After submission, an admin will review your documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-sm">
              <span className="font-medium">Current status:</span>{' '}
              {userDetails ? getVerificationBadge(userDetails.verificationStatus) : '...'}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Step 1: Upload Identity Document</Label>
              <Input type="file" accept="image/*,.pdf" onChange={handleFileSelect} />
              <Button
                onClick={uploadDocumentInApp}
                disabled={
                  !selectedFile ||
                  isSubmitting ||
                  !verificationToken ||
                  !(
                    userDetails?.verificationStatus === 'pending' ||
                    (userDetails?.verificationStatus === 'resubmission_required' && userDetails?.passportDocument?.allowResubmission)
                  )
                }
                className="w-full"
              >
                {isSubmitting ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Step 2: Sign Service Agreement</Label>
              <div className="text-xs text-gray-600">You can sign after your document is uploaded.</div>
              <Button
                onClick={signContractInApp}
                disabled={isSubmitting || !verificationToken || userDetails?.verificationStatus !== 'documents_uploaded'}
                className="w-full"
              >
                {isSubmitting ? 'Signing...' : 'Sign Agreement'}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              After you complete these steps, an admin will review your submission. You’ll be notified when your account is activated.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}