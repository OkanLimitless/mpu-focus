'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Upload, FileText, LogOut, AlertCircle, Clock, CheckCircle2, XCircle, Mail } from 'lucide-react'
import { signOut } from 'next-auth/react'

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

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>
      case 'documents_uploaded':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Documents Uploaded</Badge>
      case 'contract_signed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Under Review</Badge>
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
        return 'Please check your email for a verification link to upload your documents and sign the service agreement.'
      case 'documents_uploaded':
        return 'Your documents have been uploaded. Please complete the contract signing process.'
      case 'contract_signed':
        return 'Your documents and contract are being reviewed by our team. This typically takes 1-2 business days.'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MPU-Focus</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user.firstName} {session.user.lastName}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Your Training Dashboard
                </h2>
                <p className="text-gray-600">
                  Track your progress and access your course materials.
                </p>
              </div>
              {userDetails && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Account Status:</span>
                  {getVerificationBadge(userDetails.verificationStatus)}
                </div>
              )}
            </div>
          </div>

          {/* Verification Status Alert */}
          {userDetails && userDetails.verificationStatus !== 'verified' && (
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-800">
                      Account Verification Required
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      {getVerificationMessage(userDetails.verificationStatus)}
                    </p>
                    {userDetails.verificationStatus === 'pending' && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4 mr-2" />
                          Contact Support for Verification Link
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Overview - Only show if verified */}
          {userDetails?.verificationStatus === 'verified' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : userProgress.overallProgress}%</div>
                  <Progress value={userProgress.overallProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Course completion progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chapters</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : `${userProgress.completedChapters}/${userProgress.totalChapters}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chapters completed
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Course Access */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Section */}
            <Card>
              <CardHeader>
                <CardTitle>Your Course</CardTitle>
                <CardDescription>
                  {userDetails?.verificationStatus === 'verified' 
                    ? 'Continue your training progress'
                    : 'Course access pending verification'
                  }
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
                      <p className="text-sm text-gray-600">
                        Complete your account verification to access the full course.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Status Details */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>
                  Your account verification progress
                </CardDescription>
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
                              : 'Not uploaded'
                            }
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
                          <p className="text-xs text-gray-600">
                            {userDetails.contractSigned ? 'Signed' : 'Not signed'}
                          </p>
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
                          <p className="text-xs text-gray-600">
                            {userDetails.verificationStatus === 'verified' 
                              ? 'Complete' 
                              : 'In progress'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}